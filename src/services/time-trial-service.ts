import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { SportType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { parseDuration } from "@/lib/duration";
import { AppError } from "@/lib/errors";
import { clubDateTimeToUtc, clubDayRange, toClubDateInput } from "@/lib/format";
import { requireTimeTrialEditAccess } from "@/lib/permissions/guards";
import { describePbChange } from "@/lib/personal-best";
import { canEditTimeTrial, canManageAthletePerformance } from "@/lib/permissions/policies";
import { athleteScope, manageableGroupScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import { emptyToNull } from "@/lib/validations/common";
import type {
  RecordTimeTrialsInput,
  TimeTrialFilter,
  UpdateTimeTrialInput,
} from "@/lib/validations/time-trials";
import { writeAuditLog } from "@/services/audit-log-service";
import { recomputePersonalBest } from "@/services/personal-best-service";

export const TIME_TRIAL_PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Pilihan form
// ---------------------------------------------------------------------------

export type DisciplineOption = {
  id: string;
  name: string;
  sportType: SportType;
  poolLength: number;
};

export async function listDisciplineOptions(): Promise<DisciplineOption[]> {
  return prisma.discipline.findMany({
    where: { isActive: true },
    orderBy: [{ sportType: "asc" }, { style: "asc" }, { distanceMeter: "asc" }],
    select: { id: true, name: true, sportType: true, poolLength: true },
  });
}

export type AthleteOption = {
  id: string;
  fullName: string;
  athleteNumber: string;
  groupId: string | null;
  groupName: string | null;
};

// Atlet aktif yang boleh dicatat hasilnya oleh actor.
export async function listRecordableAthletes(actor: Actor): Promise<AthleteOption[]> {
  const athletes = await prisma.athleteProfile.findMany({
    where: { AND: [athleteScope(actor), { isActive: true }] },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      athleteNumber: true,
      trainingGroup: { select: { id: true, name: true } },
    },
  });
  return athletes.map(({ trainingGroup, ...athlete }) => ({
    ...athlete,
    groupId: trainingGroup?.id ?? null,
    groupName: trainingGroup?.name ?? null,
  }));
}

export type SessionOption = { id: string; label: string; date: string; groupId: string };

// Sesi 30 hari terakhir sampai hari ini, di kelompok yang dikelola actor.
export async function listRecentSessionOptions(actor: Actor): Promise<SessionOption[]> {
  const today = toClubDateInput(new Date());
  const sessions = await prisma.trainingSession.findMany({
    where: {
      AND: [
        { trainingGroup: manageableGroupScope(actor) },
        {
          startsAt: {
            gte: new Date(clubDayRange(today).start.getTime() - 30 * 864e5),
            lt: clubDayRange(today).end,
          },
        },
      ],
    },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      trainingGroup: { select: { id: true, name: true } },
    },
  });
  return sessions.map((session) => ({
    id: session.id,
    date: toClubDateInput(session.startsAt),
    groupId: session.trainingGroup.id,
    label: `${toClubDateInput(session.startsAt)} · ${session.title} (${session.trainingGroup.name})`,
  }));
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function listTimeTrials(actor: Actor, filter: TimeTrialFilter) {
  const where: Prisma.TimeTrialWhereInput = {
    AND: [
      { athlete: athleteScope(actor) },
      filter.athlete ? { athleteId: filter.athlete } : {},
      filter.discipline ? { disciplineId: filter.discipline } : {},
    ],
  };

  const [total, items] = await prisma.$transaction([
    prisma.timeTrial.count({ where }),
    prisma.timeTrial.findMany({
      where,
      orderBy: [{ trialDate: "desc" }, { createdAt: "desc" }],
      skip: (filter.page - 1) * TIME_TRIAL_PAGE_SIZE,
      take: TIME_TRIAL_PAGE_SIZE,
      select: {
        id: true,
        durationMs: true,
        trialDate: true,
        note: true,
        athlete: { select: { id: true, fullName: true } },
        discipline: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Tandai time trial yang saat ini menjadi PB.
  const pbSourceIds = new Set(
    (
      await prisma.personalBest.findMany({
        where: { sourceType: "TIME_TRIAL", sourceId: { in: items.map((item) => item.id) } },
        select: { sourceId: true },
      })
    ).map((pb) => pb.sourceId),
  );

  return {
    items: items.map((item) => ({ ...item, isCurrentPb: pbSourceIds.has(item.id) })),
    total,
    page: filter.page,
    pageSize: TIME_TRIAL_PAGE_SIZE,
  };
}

export async function getTimeTrial(actor: Actor, timeTrialId: string) {
  const trial = await prisma.timeTrial.findFirst({
    where: { AND: [{ id: timeTrialId }, { athlete: athleteScope(actor) }] },
    select: {
      id: true,
      durationMs: true,
      trialDate: true,
      note: true,
      createdAt: true,
      athlete: {
        select: { id: true, fullName: true, trainingGroup: { select: { coachId: true } } },
      },
      discipline: { select: { id: true, name: true } },
      trainingSession: { select: { id: true, title: true } },
      recordedBy: { select: { name: true } },
    },
  });
  if (!trial) throw new AppError("NOT_FOUND", "Time trial tidak ditemukan.");

  const pb = await prisma.personalBest.findUnique({
    where: {
      athleteId_disciplineId: { athleteId: trial.athlete.id, disciplineId: trial.discipline.id },
    },
    select: { durationMs: true, sourceId: true },
  });

  return {
    ...trial,
    personalBest: pb,
    canManage: canEditTimeTrial(actor, {
      athlete: { coachId: trial.athlete.trainingGroup?.coachId ?? null },
    }),
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export type RecordedResult = {
  timeTrialId: string;
  athleteName: string;
  durationMs: number;
  previousPbMs: number | null;
  isNewPb: boolean;
};

export async function recordTimeTrials(
  actor: Actor,
  input: RecordTimeTrialsInput,
): Promise<RecordedResult[]> {
  const discipline = await prisma.discipline.findFirst({
    where: { id: input.disciplineId, isActive: true },
    select: { id: true, name: true },
  });
  if (!discipline)
    throw new AppError("VALIDATION_ERROR", "Nomor lomba tidak ditemukan.", "disciplineId");

  const athleteIds = input.entries.map((entry) => entry.athleteId);
  const athletes = await prisma.athleteProfile.findMany({
    where: { AND: [athleteScope(actor), { id: { in: athleteIds } }, { isActive: true }] },
    select: { id: true, fullName: true, trainingGroup: { select: { coachId: true } } },
  });
  const allowed = athletes.filter((athlete) =>
    canManageAthletePerformance(actor, { coachId: athlete.trainingGroup?.coachId ?? null }),
  );
  if (allowed.length !== athleteIds.length) {
    throw new AppError("FORBIDDEN", "Ada atlet yang tidak boleh kamu catat hasilnya.");
  }
  const nameById = new Map(allowed.map((athlete) => [athlete.id, athlete.fullName]));

  let trialDate = clubDateTimeToUtc(input.date, "00:00");
  const trainingSessionId = emptyToNull(input.trainingSessionId);
  if (trainingSessionId) {
    const session = await prisma.trainingSession.findFirst({
      where: { AND: [{ id: trainingSessionId }, { trainingGroup: manageableGroupScope(actor) }] },
      select: { startsAt: true },
    });
    if (!session)
      throw new AppError("VALIDATION_ERROR", "Sesi latihan tidak ditemukan.", "trainingSessionId");
    trialDate = session.startsAt;
  }

  return prisma.$transaction(async (tx) => {
    const results: RecordedResult[] = [];
    for (const entry of input.entries) {
      const durationMs = parseDuration(entry.time) as number;
      const trial = await tx.timeTrial.create({
        data: {
          athleteId: entry.athleteId,
          disciplineId: discipline.id,
          trainingSessionId,
          durationMs,
          trialDate,
          note: emptyToNull(entry.note),
          recordedById: actor.userId,
        },
        select: { id: true },
      });
      const { before, after } = await recomputePersonalBest(tx, entry.athleteId, discipline.id);
      const change = describePbChange(before, after, trial.id);
      results.push({
        timeTrialId: trial.id,
        athleteName: nameById.get(entry.athleteId) ?? "",
        durationMs,
        previousPbMs: change.previousMs,
        isNewPb: change.isNewPb,
      });
    }

    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "time_trial.recorded",
      entityType: "Discipline",
      entityId: discipline.id,
      metadata: {
        discipline: discipline.name,
        count: results.length,
        newPbs: results.filter((result) => result.isNewPb).length,
      },
    });
    return results;
  });
}

export async function updateTimeTrial(actor: Actor, input: UpdateTimeTrialInput) {
  await requireTimeTrialEditAccess(actor, input.timeTrialId);
  const before = await prisma.timeTrial.findUniqueOrThrow({ where: { id: input.timeTrialId } });
  const durationMs = parseDuration(input.time) as number;
  // Tanggal hanya berubah jika memang diganti (jam asli dari sesi latihan dipertahankan).
  const trialDate =
    toClubDateInput(before.trialDate) === input.date
      ? before.trialDate
      : clubDateTimeToUtc(input.date, "00:00");

  return prisma.$transaction(async (tx) => {
    await tx.timeTrial.update({
      where: { id: input.timeTrialId },
      data: { durationMs, trialDate, note: emptyToNull(input.note) },
    });
    const { after } = await recomputePersonalBest(tx, before.athleteId, before.disciplineId);
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "time_trial.updated",
      entityType: "TimeTrial",
      entityId: input.timeTrialId,
      metadata: {
        durationMs: { from: before.durationMs, to: durationMs },
        trialDate: { from: toClubDateInput(before.trialDate), to: input.date },
      },
    });
    return { isCurrentPb: after?.sourceId === input.timeTrialId };
  });
}

export async function deleteTimeTrial(actor: Actor, timeTrialId: string) {
  await requireTimeTrialEditAccess(actor, timeTrialId);
  const trial = await prisma.timeTrial.findUniqueOrThrow({ where: { id: timeTrialId } });

  await prisma.$transaction(async (tx) => {
    await tx.timeTrial.delete({ where: { id: timeTrialId } });
    // Jika time trial ini adalah PB, PB turun ke hasil terbaik berikutnya (atau dihapus).
    await recomputePersonalBest(tx, trial.athleteId, trial.disciplineId);
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "time_trial.deleted",
      entityType: "TimeTrial",
      entityId: timeTrialId,
      metadata: {
        athleteId: trial.athleteId,
        disciplineId: trial.disciplineId,
        durationMs: trial.durationMs,
      },
    });
  });
}
