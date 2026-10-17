import "server-only";

import type { AttendanceStatus } from "@/generated/prisma/enums";
import { canRecordAttendanceOn, summarizeAttendance } from "@/lib/attendance";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { clubDayRange, toClubDateInput } from "@/lib/format";
import { canManageTrainingGroup } from "@/lib/permissions/policies";
import { athleteScope, manageableGroupScope, trainingSessionScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import type { AttendanceSummaryFilter, SaveAttendanceInput } from "@/lib/validations/attendance";
import { emptyToNull } from "@/lib/validations/common";
import { writeAuditLog } from "@/services/audit-log-service";

export type RosterRow = {
  athleteId: string;
  fullName: string;
  athleteNumber: string;
  status: AttendanceStatus | null;
  note: string;
  // Atlet sudah tidak di kelompok ini, tapi punya catatan di sesi ini.
  formerMember: boolean;
};

// ---------------------------------------------------------------------------
// Satu sesi
// ---------------------------------------------------------------------------

export async function getSessionAttendance(actor: Actor, sessionId: string) {
  const session = await prisma.trainingSession.findFirst({
    where: { AND: [{ id: sessionId }, trainingSessionScope(actor)] },
    select: {
      id: true,
      startsAt: true,
      trainingGroupId: true,
      trainingGroup: { select: { coachId: true } },
      attendances: {
        select: {
          athleteId: true,
          status: true,
          note: true,
          athlete: { select: { fullName: true, athleteNumber: true, trainingGroupId: true } },
        },
      },
    },
  });
  if (!session) throw new AppError("NOT_FOUND", "Sesi latihan tidak ditemukan.");

  const members = await prisma.athleteProfile.findMany({
    where: { trainingGroupId: session.trainingGroupId, deletedAt: null, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, athleteNumber: true },
  });

  const recorded = new Map(session.attendances.map((a) => [a.athleteId, a]));
  const rows: RosterRow[] = members.map((athlete) => ({
    athleteId: athlete.id,
    fullName: athlete.fullName,
    athleteNumber: athlete.athleteNumber,
    status: recorded.get(athlete.id)?.status ?? null,
    note: recorded.get(athlete.id)?.note ?? "",
    formerMember: false,
  }));
  for (const record of session.attendances) {
    if (members.some((m) => m.id === record.athleteId)) continue;
    rows.push({
      athleteId: record.athleteId,
      fullName: record.athlete.fullName,
      athleteNumber: record.athlete.athleteNumber,
      status: record.status,
      note: record.note ?? "",
      formerMember: true,
    });
  }

  const canManage = canManageTrainingGroup(actor, session.trainingGroup);
  return {
    rows,
    canManage,
    canRecord: canManage && canRecordAttendanceOn(session.startsAt),
    summary: summarizeAttendance(session.attendances.map((a) => a.status)),
  };
}

export async function saveSessionAttendance(actor: Actor, input: SaveAttendanceInput) {
  const session = await prisma.trainingSession.findFirst({
    where: { AND: [{ id: input.sessionId }, { trainingGroup: manageableGroupScope(actor) }] },
    select: { id: true, startsAt: true, trainingGroupId: true, title: true },
  });
  if (!session) throw new AppError("NOT_FOUND", "Sesi latihan tidak ditemukan.");
  if (!canRecordAttendanceOn(session.startsAt)) {
    throw new AppError("CONFLICT", "Absensi baru bisa dicatat mulai hari sesi latihan.");
  }

  // Hanya atlet kelompok ini, atau yang sudah punya catatan di sesi ini (pindah kelompok).
  const athleteIds = input.entries.map((entry) => entry.athleteId);
  const allowed = await prisma.athleteProfile.findMany({
    where: {
      id: { in: athleteIds },
      deletedAt: null,
      OR: [
        { trainingGroupId: session.trainingGroupId },
        { attendances: { some: { trainingSessionId: session.id } } },
      ],
    },
    select: { id: true },
  });
  if (allowed.length !== athleteIds.length) {
    throw new AppError("FORBIDDEN", "Ada atlet yang bukan anggota kelompok sesi ini.");
  }

  await prisma.$transaction(async (tx) => {
    for (const entry of input.entries) {
      const data = {
        status: entry.status,
        note: emptyToNull(entry.note),
        recordedById: actor.userId,
      };
      await tx.attendance.upsert({
        where: {
          trainingSessionId_athleteId: {
            trainingSessionId: session.id,
            athleteId: entry.athleteId,
          },
        },
        create: { ...data, trainingSessionId: session.id, athleteId: entry.athleteId },
        update: data,
      });
    }
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "attendance.recorded",
      entityType: "TrainingSession",
      entityId: session.id,
      metadata: {
        title: session.title,
        ...summarizeAttendance(input.entries.map((entry) => entry.status)),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Rekap
// ---------------------------------------------------------------------------

export function summaryRange(filter: AttendanceSummaryFilter, now = new Date()) {
  const to = filter.to ?? toClubDateInput(now);
  const from =
    filter.from ?? toClubDateInput(new Date(clubDayRange(to).start.getTime() - 29 * 864e5));
  return { from, to };
}

export async function getAttendanceSummary(actor: Actor, filter: AttendanceSummaryFilter) {
  const { from, to } = summaryRange(filter);
  const now = new Date();
  const sessionWhere = {
    AND: [
      trainingSessionScope(actor),
      filter.group ? { trainingGroupId: filter.group } : {},
      { startsAt: { gte: clubDayRange(from).start, lt: clubDayRange(to).end } },
      { startsAt: { lte: now } },
    ],
  };

  const [athletes, records, pendingSessions] = await Promise.all([
    prisma.athleteProfile.findMany({
      where: {
        AND: [
          athleteScope(actor),
          { isActive: true },
          filter.group ? { trainingGroupId: filter.group } : {},
        ],
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        athleteNumber: true,
        trainingGroup: { select: { name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { trainingSession: sessionWhere, athlete: athleteScope(actor) },
      select: { athleteId: true, status: true },
    }),
    prisma.trainingSession.findMany({
      where: { ...sessionWhere, attendances: { none: {} } },
      orderBy: { startsAt: "desc" },
      take: 20,
      select: { id: true, title: true, startsAt: true, trainingGroup: { select: { name: true } } },
    }),
  ]);

  const byAthlete = new Map<string, AttendanceStatus[]>();
  for (const record of records) {
    byAthlete.set(record.athleteId, [...(byAthlete.get(record.athleteId) ?? []), record.status]);
  }

  return {
    from,
    to,
    rows: athletes.map((athlete) => ({
      ...athlete,
      counts: summarizeAttendance(byAthlete.get(athlete.id) ?? []),
    })),
    overall: summarizeAttendance(records.map((record) => record.status)),
    pendingSessions,
  };
}

// Riwayat absensi atlet sendiri (terbaru dulu).
export async function getMyAttendanceHistory(actor: Actor, take = 20) {
  if (!actor.athleteId) return { records: [], counts: summarizeAttendance([]) };
  const records = await prisma.attendance.findMany({
    where: { athleteId: actor.athleteId },
    orderBy: { trainingSession: { startsAt: "desc" } },
    take,
    select: {
      id: true,
      status: true,
      note: true,
      trainingSession: { select: { title: true, startsAt: true } },
    },
  });
  const all = await prisma.attendance.findMany({
    where: { athleteId: actor.athleteId },
    select: { status: true },
  });
  return { records, counts: summarizeAttendance(all.map((record) => record.status)) };
}
