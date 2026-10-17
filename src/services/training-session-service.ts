import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { clubDateTimeToUtc, clubDayRange, toClubDateInput } from "@/lib/format";
import { canManageTrainingGroup } from "@/lib/permissions/policies";
import { manageableGroupScope, trainingSessionScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import { emptyToNull } from "@/lib/validations/common";
import type {
  TrainingSessionFilter,
  TrainingSessionInput,
  UpdateTrainingSessionInput,
} from "@/lib/validations/training";
import { diffForAudit, writeAuditLog } from "@/services/audit-log-service";
import type { GroupOption } from "@/services/training-group-service";

export const SESSION_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

// Tanpa filter tanggal: mulai hari ini (jadwal yang akan datang).
export function effectiveRange(filter: TrainingSessionFilter, now = new Date()) {
  const from = filter.from ?? (filter.to ? undefined : toClubDateInput(now));
  return { from, to: filter.to };
}

export async function listTrainingSessions(actor: Actor, filter: TrainingSessionFilter) {
  const { from, to } = effectiveRange(filter);
  const where: Prisma.TrainingSessionWhereInput = {
    AND: [
      trainingSessionScope(actor),
      filter.group ? { trainingGroupId: filter.group } : {},
      from ? { startsAt: { gte: clubDayRange(from).start } } : {},
      to ? { startsAt: { lt: clubDayRange(to).end } } : {},
    ],
  };

  const [total, items] = await prisma.$transaction([
    prisma.trainingSession.count({ where }),
    prisma.trainingSession.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (filter.page - 1) * SESSION_PAGE_SIZE,
      take: SESSION_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        location: true,
        trainingGroup: { select: { id: true, name: true } },
        _count: { select: { attendances: true } },
      },
    }),
  ]);

  return { items, total, page: filter.page, pageSize: SESSION_PAGE_SIZE, from, to };
}

// Ownership guard: sesi di luar scope actor dianggap tidak ada (404), bukan 403,
// agar ID sesi kelompok lain tidak bisa ditebak.
export async function getTrainingSession(actor: Actor, sessionId: string) {
  const session = await prisma.trainingSession.findFirst({
    where: { AND: [{ id: sessionId }, trainingSessionScope(actor)] },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      location: true,
      notes: true,
      trainingGroupId: true,
      createdAt: true,
      trainingGroup: {
        select: { id: true, name: true, coachId: true, coach: { select: { fullName: true } } },
      },
      createdBy: { select: { name: true } },
      _count: { select: { attendances: true, timeTrials: true } },
    },
  });
  if (!session) throw new AppError("NOT_FOUND", "Sesi latihan tidak ditemukan.");
  return { ...session, canManage: canManageTrainingGroup(actor, session.trainingGroup) };
}

export async function listManageableGroupOptions(actor: Actor): Promise<GroupOption[]> {
  return prisma.trainingGroup.findMany({
    where: manageableGroupScope(actor),
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// Jadwal atlet: sesi kelompoknya mulai hari ini.
export async function getAthleteSchedule(actor: Actor, now = new Date()) {
  const athlete = actor.athleteId
    ? await prisma.athleteProfile.findUnique({
        where: { id: actor.athleteId },
        select: {
          trainingGroup: { select: { name: true, coach: { select: { fullName: true } } } },
        },
      })
    : null;

  const sessions = await prisma.trainingSession.findMany({
    where: {
      AND: [
        trainingSessionScope(actor),
        { startsAt: { gte: clubDayRange(toClubDateInput(now)).start } },
      ],
    },
    orderBy: { startsAt: "asc" },
    take: 30,
    select: { id: true, title: true, startsAt: true, endsAt: true, location: true, notes: true },
  });

  return { group: athlete?.trainingGroup ?? null, sessions };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function assertCanManageGroup(actor: Actor, groupId: string) {
  const group = await prisma.trainingGroup.findFirst({
    where: { AND: [{ id: groupId }, manageableGroupScope(actor)] },
    select: { id: true },
  });
  if (!group) {
    throw new AppError(
      "FORBIDDEN",
      "Kamu tidak bisa mengatur jadwal untuk kelompok ini.",
      "trainingGroupId",
    );
  }
}

function toSessionData(input: TrainingSessionInput) {
  return {
    trainingGroupId: input.trainingGroupId,
    title: input.title,
    startsAt: clubDateTimeToUtc(input.date, input.startTime),
    endsAt: clubDateTimeToUtc(input.date, input.endTime),
    location: emptyToNull(input.location),
    notes: emptyToNull(input.notes),
  };
}

export async function createTrainingSession(actor: Actor, input: TrainingSessionInput) {
  await assertCanManageGroup(actor, input.trainingGroupId);
  const data = toSessionData(input);

  return prisma.$transaction(async (tx) => {
    const session = await tx.trainingSession.create({
      data: { ...data, createdById: actor.userId },
      select: { id: true },
    });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "training_session.created",
      entityType: "TrainingSession",
      entityId: session.id,
      metadata: { title: data.title, startsAt: data.startsAt.toISOString() },
    });
    return session;
  });
}

async function findManageableSession(actor: Actor, sessionId: string) {
  const session = await prisma.trainingSession.findFirst({
    where: { AND: [{ id: sessionId }, { trainingGroup: manageableGroupScope(actor) }] },
  });
  if (!session) throw new AppError("NOT_FOUND", "Sesi latihan tidak ditemukan.");
  return session;
}

export async function updateTrainingSession(actor: Actor, input: UpdateTrainingSessionInput) {
  const before = await findManageableSession(actor, input.sessionId);
  // Memindahkan sesi ke kelompok lain juga harus kelompok yang boleh dikelola.
  await assertCanManageGroup(actor, input.trainingGroupId);
  const data = toSessionData(input);

  await prisma.$transaction(async (tx) => {
    await tx.trainingSession.update({ where: { id: input.sessionId }, data });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "training_session.updated",
      entityType: "TrainingSession",
      entityId: input.sessionId,
      metadata: diffForAudit(
        { ...before, startsAt: before.startsAt.toISOString(), endsAt: before.endsAt.toISOString() },
        { ...data, startsAt: data.startsAt.toISOString(), endsAt: data.endsAt.toISOString() },
      ),
    });
  });
}

// Sesi yang sudah punya absensi / time trial tidak dihapus agar riwayat tidak hilang.
export async function deleteTrainingSession(actor: Actor, sessionId: string) {
  const session = await findManageableSession(actor, sessionId);
  const [attendances, timeTrials] = await Promise.all([
    prisma.attendance.count({ where: { trainingSessionId: sessionId } }),
    prisma.timeTrial.count({ where: { trainingSessionId: sessionId } }),
  ]);
  if (attendances > 0 || timeTrials > 0) {
    throw new AppError(
      "CONFLICT",
      "Sesi ini sudah punya absensi atau time trial, jadi tidak bisa dihapus.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.trainingSession.delete({ where: { id: sessionId } });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "training_session.deleted",
      entityType: "TrainingSession",
      entityId: sessionId,
      metadata: { title: session.title, startsAt: session.startsAt.toISOString() },
    });
  });
}
