import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { dateOnlyToClubInstant } from "@/lib/format";
import type { ResultCandidate } from "@/lib/personal-best";
import { markProgression, pickPersonalBest } from "@/lib/personal-best";

// PB adalah "materialized minimum" dari semua hasil sah atlet di satu nomor lomba:
// time trial + hasil lomba berstatus FINISHED. Dihitung ulang setiap kali ada hasil
// dibuat / diubah / dihapus, sehingga selalu konsisten (doc/ARCHITECTURE.md §10).
export async function recomputePersonalBest(
  tx: Prisma.TransactionClient,
  athleteId: string,
  disciplineId: string,
) {
  const where = { athleteId_disciplineId: { athleteId, disciplineId } };
  const before = await tx.personalBest.findUnique({ where });

  const [trials, races] = await Promise.all([
    tx.timeTrial.findMany({
      where: { athleteId, disciplineId },
      select: { id: true, durationMs: true, trialDate: true },
    }),
    tx.raceResult.findMany({
      where: {
        status: "FINISHED",
        durationMs: { not: null },
        competitionEntry: { athleteId, disciplineId },
      },
      select: {
        id: true,
        durationMs: true,
        competitionEntry: {
          select: { registration: { select: { competition: { select: { startDate: true } } } } },
        },
      },
    }),
  ]);

  const candidates: ResultCandidate[] = [
    ...trials.map((trial) => ({
      durationMs: trial.durationMs,
      achievedAt: trial.trialDate,
      sourceType: "TIME_TRIAL" as const,
      sourceId: trial.id,
    })),
    ...races.map((race) => ({
      durationMs: race.durationMs as number,
      achievedAt: dateOnlyToClubInstant(race.competitionEntry.registration.competition.startDate),
      sourceType: "COMPETITION" as const,
      sourceId: race.id,
    })),
  ];

  const best = pickPersonalBest(candidates);
  if (!best) {
    if (before) await tx.personalBest.delete({ where });
    return { before, after: null };
  }

  const data = {
    durationMs: best.durationMs,
    achievedAt: best.achievedAt,
    sourceType: best.sourceType,
    sourceId: best.sourceId,
  };
  const after = await tx.personalBest.upsert({
    where,
    create: { athleteId, disciplineId, ...data },
    update: data,
  });
  return { before, after };
}

// ---------------------------------------------------------------------------
// Query (akses ke atlet dicek oleh pemanggil: requireAthleteAccess / actor.athleteId)
// ---------------------------------------------------------------------------

export async function listPersonalBests(athleteId: string) {
  return prisma.personalBest.findMany({
    where: { athleteId },
    orderBy: [{ discipline: { sportType: "asc" } }, { discipline: { distanceMeter: "asc" } }],
    select: {
      id: true,
      durationMs: true,
      achievedAt: true,
      sourceType: true,
      discipline: {
        select: { id: true, name: true, sportType: true, poolLength: true },
      },
    },
  });
}

export async function getDisciplineProgress(athleteId: string, disciplineId: string) {
  const discipline = await prisma.discipline.findUnique({
    where: { id: disciplineId },
    select: { id: true, name: true, sportType: true, poolLength: true },
  });
  if (!discipline) throw new AppError("NOT_FOUND", "Nomor lomba tidak ditemukan.");

  const [pb, trials, races] = await Promise.all([
    prisma.personalBest.findUnique({
      where: { athleteId_disciplineId: { athleteId, disciplineId } },
      select: { durationMs: true, achievedAt: true, sourceId: true, sourceType: true },
    }),
    prisma.timeTrial.findMany({
      where: { athleteId, disciplineId },
      select: {
        id: true,
        durationMs: true,
        trialDate: true,
        note: true,
        trainingSession: { select: { title: true } },
      },
    }),
    prisma.raceResult.findMany({
      where: {
        status: "FINISHED",
        durationMs: { not: null },
        competitionEntry: { athleteId, disciplineId },
      },
      select: {
        id: true,
        durationMs: true,
        note: true,
        competitionEntry: {
          select: {
            registration: { select: { competition: { select: { name: true, startDate: true } } } },
          },
        },
      },
    }),
  ]);

  const results = markProgression([
    ...trials.map((trial) => ({
      id: trial.id,
      date: trial.trialDate,
      durationMs: trial.durationMs,
      source: "TIME_TRIAL" as const,
      label: trial.trainingSession?.title ?? null,
      note: trial.note,
    })),
    ...races.map((race) => {
      const competition = race.competitionEntry.registration.competition;
      return {
        id: race.id,
        date: dateOnlyToClubInstant(competition.startDate),
        durationMs: race.durationMs as number,
        source: "COMPETITION" as const,
        label: competition.name,
        note: race.note,
      };
    }),
  ]);

  return { discipline, pb, results };
}
