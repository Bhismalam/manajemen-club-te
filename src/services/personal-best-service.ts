import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ResultCandidate } from "@/lib/personal-best";
import { pickPersonalBest } from "@/lib/personal-best";

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
      achievedAt: race.competitionEntry.registration.competition.startDate,
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
