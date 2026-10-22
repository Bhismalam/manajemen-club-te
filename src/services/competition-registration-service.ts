import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { toClubDateInput } from "@/lib/format";
import {
  canExportRegistrations,
  canRegisterAthlete,
  isRegistrationOpen,
} from "@/lib/permissions/policies";
import { athleteScope, competitionScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import { diffDisciplines, exceedsEntryLimit, registrationDenyMessage } from "@/lib/registrations";
import { dateOnly } from "@/lib/validations/common";
import type { RosterFilter } from "@/lib/validations/registrations";
import { writeAuditLog } from "@/services/audit-log-service";

// Pendaftaran event (doc/PRD.md §4.9.2). Satu registration per atlet per event,
// berisi satu atau lebih CompetitionEntry (nomor lomba + seed time dari PB).

const REGISTERED = { status: "REGISTERED" } as const;

export function rosterPath(competitionId: string) {
  return `/admin/competitions/${competitionId}/registrations`;
}

// ---------------------------------------------------------------------------
// Data bersama untuk form pendaftaran
// ---------------------------------------------------------------------------

const competitionForRegistration = {
  id: true,
  name: true,
  description: true,
  location: true,
  startDate: true,
  endDate: true,
  level: true,
  status: true,
  createdById: true,
  registrationOpensAt: true,
  registrationClosesAt: true,
  maxEntriesPerAthlete: true,
  attachmentName: true,
  disciplines: {
    orderBy: [
      { discipline: { sportType: "asc" } },
      { discipline: { style: "asc" } },
      { discipline: { distanceMeter: "asc" } },
    ],
    select: {
      discipline: { select: { id: true, name: true, sportType: true, poolLength: true } },
    },
  },
} satisfies Prisma.CompetitionSelect;

async function findVisibleCompetition(actor: Actor, competitionId: string) {
  const competition = await prisma.competition.findFirst({
    where: { AND: [{ id: competitionId }, competitionScope(actor)] },
    select: competitionForRegistration,
  });
  if (!competition) throw new AppError("NOT_FOUND", "Event tidak ditemukan.");
  return {
    ...competition,
    disciplines: competition.disciplines.map((d) => d.discipline),
  };
}

export type RegistrationCompetition = Awaited<ReturnType<typeof findVisibleCompetition>>;

export type EditorAthlete = {
  id: string;
  fullName: string;
  athleteNumber: string;
  groupName: string | null;
  // PB per nomor lomba event ini (durationMs).
  personalBests: Record<string, number>;
  registration: {
    status: "REGISTERED" | "CANCELLED";
    disciplineIds: string[];
    registeredByName: string;
    updatedAt: Date;
  } | null;
};

async function loadEditorAthletes(
  competition: RegistrationCompetition,
  where: Prisma.AthleteProfileWhereInput,
): Promise<EditorAthlete[]> {
  const disciplineIds = competition.disciplines.map((d) => d.id);
  const athletes = await prisma.athleteProfile.findMany({
    where,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      athleteNumber: true,
      trainingGroup: { select: { name: true } },
      personalBests: {
        where: { disciplineId: { in: disciplineIds } },
        select: { disciplineId: true, durationMs: true },
      },
      registrations: {
        where: { competitionId: competition.id },
        select: {
          status: true,
          updatedAt: true,
          registeredBy: { select: { name: true } },
          entries: { select: { disciplineId: true } },
        },
      },
    },
  });

  return athletes.map((athlete) => {
    const registration = athlete.registrations[0];
    return {
      id: athlete.id,
      fullName: athlete.fullName,
      athleteNumber: athlete.athleteNumber,
      groupName: athlete.trainingGroup?.name ?? null,
      personalBests: Object.fromEntries(
        athlete.personalBests.map((pb) => [pb.disciplineId, pb.durationMs]),
      ),
      registration: registration
        ? {
            status: registration.status,
            disciplineIds: registration.entries.map((e) => e.disciplineId),
            registeredByName: registration.registeredBy.name,
            updatedAt: registration.updatedAt,
          }
        : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Atlet
// ---------------------------------------------------------------------------

// Event terbit yang belum selesai, deadline terdekat dulu, beserta status pendaftaran saya.
export async function listAthleteEvents(actor: Actor, now = new Date()) {
  const events = await prisma.competition.findMany({
    where: {
      AND: [
        competitionScope(actor),
        { status: { in: ["UPCOMING", "ONGOING"] } },
        { endDate: { gte: dateOnly(toClubDateInput(now)) } },
      ],
    },
    orderBy: [{ registrationClosesAt: "asc" }, { startDate: "asc" }],
    select: {
      id: true,
      name: true,
      location: true,
      startDate: true,
      endDate: true,
      level: true,
      status: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
      _count: { select: { disciplines: true } },
      registrations: actor.athleteId
        ? {
            where: { athleteId: actor.athleteId, ...REGISTERED },
            select: { _count: { select: { entries: true } } },
          }
        : { where: { id: { in: [] } }, select: { _count: { select: { entries: true } } } },
    },
  });

  return events.map(({ registrations, ...event }) => ({
    ...event,
    myEntryCount: registrations[0]?._count.entries ?? null,
  }));
}

export async function getAthleteEventView(actor: Actor, competitionId: string, now = new Date()) {
  const competition = await findVisibleCompetition(actor, competitionId);
  const [self] = actor.athleteId
    ? await loadEditorAthletes(competition, { id: actor.athleteId })
    : [];
  return {
    competition,
    athlete: self ?? null,
    isOpen: isRegistrationOpen(competition, now),
  };
}

// ---------------------------------------------------------------------------
// Pelatih & admin
// ---------------------------------------------------------------------------

// Atlet aktif yang boleh didaftarkan actor (coach: binaan; admin: semua), plus atlet nonaktif
// yang sudah punya pendaftaran di event ini agar tetap terlihat.
export async function getRegistrationBoard(actor: Actor, competitionId: string, now = new Date()) {
  const competition = await findVisibleCompetition(actor, competitionId);
  const athletes = await loadEditorAthletes(competition, {
    AND: [
      athleteScope(actor),
      { OR: [{ isActive: true }, { registrations: { some: { competitionId } } }] },
    ],
  });
  return { competition, athletes, isOpen: isRegistrationOpen(competition, now) };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

type RegistrationContext = {
  competition: RegistrationCompetition;
  athlete: { id: string; fullName: string };
};

// Event harus terlihat oleh actor (404), lalu izin pendaftaran atas atlet tersebut.
async function authorize(
  actor: Actor,
  competitionId: string,
  athleteId: string,
  now: Date,
): Promise<RegistrationContext> {
  const competition = await findVisibleCompetition(actor, competitionId);
  const athlete = await prisma.athleteProfile.findFirst({
    where: { id: athleteId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      isActive: true,
      trainingGroup: { select: { coachId: true } },
    },
  });
  if (!athlete) throw new AppError("NOT_FOUND", "Atlet tidak ditemukan.");

  const decision = canRegisterAthlete(
    actor,
    { id: athlete.id, isActive: athlete.isActive, coachId: athlete.trainingGroup?.coachId ?? null },
    competition,
    now,
  );
  if (!decision.allowed) {
    throw new AppError(
      decision.reason === "FORBIDDEN" ? "FORBIDDEN" : "CONFLICT",
      registrationDenyMessage(decision.reason),
    );
  }
  return { competition, athlete };
}

async function notifyAdmins(
  tx: Prisma.TransactionClient,
  actor: Actor,
  notification: { type: NotificationType; title: string; message: string; competitionId: string },
) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null, id: { not: actor.userId } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await tx.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      linkUrl: rosterPath(notification.competitionId),
    })),
  });
}

function registeredByLabel(actor: Actor) {
  if (actor.role === "ATHLETE") return "mendaftar";
  return actor.role === "COACH" ? "didaftarkan pelatih" : "didaftarkan admin";
}

export type SaveRegistrationResult = { outcome: "created" | "updated" | "unchanged" };

export async function saveRegistration(
  actor: Actor,
  input: { competitionId: string; athleteId: string; disciplineIds: string[] },
  now = new Date(),
): Promise<SaveRegistrationResult> {
  const { competition, athlete } = await authorize(
    actor,
    input.competitionId,
    input.athleteId,
    now,
  );

  const open = new Set(competition.disciplines.map((d) => d.id));
  if (input.disciplineIds.some((id) => !open.has(id))) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Ada nomor lomba yang tidak dibuka di event ini.",
      "disciplineIds",
    );
  }
  if (exceedsEntryLimit(input.disciplineIds.length, competition.maxEntriesPerAthlete)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Maksimal ${competition.maxEntriesPerAthlete} nomor lomba per atlet.`,
      "disciplineIds",
    );
  }

  const existing = await prisma.competitionRegistration.findUnique({
    where: { competitionId_athleteId: { competitionId: competition.id, athleteId: athlete.id } },
    select: {
      id: true,
      status: true,
      entries: { select: { disciplineId: true, _count: { select: { raceResults: true } } } },
    },
  });
  const currentIds = existing?.entries.map((e) => e.disciplineId) ?? [];
  const { added, removed } = diffDisciplines(currentIds, input.disciplineIds);
  const reactivating = existing?.status === "CANCELLED";

  if (existing && !reactivating && added.length === 0 && removed.length === 0) {
    return { outcome: "unchanged" };
  }
  const removedWithResults = existing?.entries.filter(
    (e) => removed.includes(e.disciplineId) && e._count.raceResults > 0,
  );
  if (removedWithResults && removedWithResults.length > 0) {
    throw new AppError(
      "CONFLICT",
      "Nomor lomba yang sudah punya hasil lomba tidak bisa dihapus.",
      "disciplineIds",
    );
  }

  // Seed time = PB atlet saat mendaftar (snapshot; tidak berubah walau PB membaik).
  const pbs = await prisma.personalBest.findMany({
    where: { athleteId: athlete.id, disciplineId: { in: added } },
    select: { disciplineId: true, durationMs: true },
  });
  const seedOf = new Map(pbs.map((pb) => [pb.disciplineId, pb.durationMs]));
  const entryData = added.map((disciplineId) => ({
    competitionId: competition.id,
    athleteId: athlete.id,
    disciplineId,
    seedTimeMs: seedOf.get(disciplineId) ?? null,
  }));

  const created = !existing || reactivating;
  await prisma.$transaction(async (tx) => {
    let registrationId: string;
    if (!existing) {
      const registration = await tx.competitionRegistration.create({
        data: {
          competitionId: competition.id,
          athleteId: athlete.id,
          registeredByUserId: actor.userId,
        },
        select: { id: true },
      });
      registrationId = registration.id;
    } else {
      registrationId = existing.id;
      await tx.competitionRegistration.update({
        where: { id: existing.id },
        data: reactivating
          ? {
              status: "REGISTERED",
              cancelledAt: null,
              cancelledByUserId: null,
              registeredByUserId: actor.userId,
            }
          : { updatedAt: now },
      });
      if (removed.length > 0) {
        await tx.competitionEntry.deleteMany({
          where: { registrationId, disciplineId: { in: removed } },
        });
      }
    }
    if (entryData.length > 0) {
      await tx.competitionEntry.createMany({
        data: entryData.map((entry) => ({ ...entry, registrationId })),
      });
    }

    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: created ? "competition_registration.created" : "competition_registration.updated",
      entityType: "CompetitionRegistration",
      entityId: registrationId,
      metadata: {
        competitionId: competition.id,
        athleteId: athlete.id,
        disciplines: input.disciplineIds,
        added,
        removed,
      },
    });
    await notifyAdmins(tx, actor, {
      type: created ? "REGISTRATION_CREATED" : "REGISTRATION_UPDATED",
      title: created ? "Pendaftaran event baru" : "Pendaftaran event diubah",
      message: created
        ? `${athlete.fullName} ${registeredByLabel(actor)} ${input.disciplineIds.length} nomor di ${competition.name}.`
        : `${athlete.fullName} kini terdaftar di ${input.disciplineIds.length} nomor di ${competition.name}.`,
      competitionId: competition.id,
    });
  });

  return { outcome: created ? "created" : "updated" };
}

export async function cancelRegistration(
  actor: Actor,
  input: { competitionId: string; athleteId: string },
  now = new Date(),
) {
  const { competition, athlete } = await authorize(
    actor,
    input.competitionId,
    input.athleteId,
    now,
  );
  const registration = await prisma.competitionRegistration.findUnique({
    where: { competitionId_athleteId: { competitionId: competition.id, athleteId: athlete.id } },
    select: {
      id: true,
      status: true,
      entries: { select: { _count: { select: { raceResults: true } } } },
    },
  });
  if (!registration || registration.status === "CANCELLED") {
    throw new AppError("NOT_FOUND", "Pendaftaran tidak ditemukan.");
  }
  if (registration.entries.some((e) => e._count.raceResults > 0)) {
    throw new AppError(
      "CONFLICT",
      "Pendaftaran yang sudah punya hasil lomba tidak bisa dibatalkan.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.competitionRegistration.update({
      where: { id: registration.id },
      data: { status: "CANCELLED", cancelledAt: now, cancelledByUserId: actor.userId },
    });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "competition_registration.cancelled",
      entityType: "CompetitionRegistration",
      entityId: registration.id,
      metadata: { competitionId: competition.id, athleteId: athlete.id },
    });
    await notifyAdmins(tx, actor, {
      type: "REGISTRATION_CANCELLED",
      title: "Pendaftaran event dibatalkan",
      message: `Pendaftaran ${athlete.fullName} di ${competition.name} dibatalkan.`,
      competitionId: competition.id,
    });
  });
}

// ---------------------------------------------------------------------------
// Rekap pendaftar (admin)
// ---------------------------------------------------------------------------

function assertCanViewRoster(actor: Actor) {
  if (!canExportRegistrations(actor)) {
    throw new AppError("FORBIDDEN", "Rekap pendaftar hanya untuk admin.");
  }
}

const rosterSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  cancelledAt: true,
  registeredBy: { select: { name: true, role: true } },
  athlete: {
    select: {
      id: true,
      fullName: true,
      athleteNumber: true,
      gender: true,
      birthDate: true,
      trainingGroup: { select: { name: true } },
    },
  },
  entries: {
    select: { disciplineId: true, seedTimeMs: true },
  },
} satisfies Prisma.CompetitionRegistrationSelect;

export type RosterRow = Prisma.CompetitionRegistrationGetPayload<{ select: typeof rosterSelect }>;

export async function getRoster(actor: Actor, competitionId: string, filter?: RosterFilter) {
  assertCanViewRoster(actor);
  const competition = await findVisibleCompetition(actor, competitionId);

  const where: Prisma.CompetitionRegistrationWhereInput = {
    AND: [
      { competitionId },
      filter?.cancelled ? {} : REGISTERED,
      filter?.gender ? { athlete: { gender: filter.gender } } : {},
      filter?.discipline ? { entries: { some: { disciplineId: filter.discipline } } } : {},
      filter?.q
        ? {
            athlete: {
              OR: [
                { fullName: { contains: filter.q, mode: "insensitive" } },
                { athleteNumber: { contains: filter.q, mode: "insensitive" } },
              ],
            },
          }
        : {},
    ],
  };

  const [rows, summaryEntries] = await Promise.all([
    prisma.competitionRegistration.findMany({
      where,
      orderBy: [{ status: "asc" }, { athlete: { fullName: "asc" } }],
      select: rosterSelect,
    }),
    // Ringkasan selalu dari semua pendaftaran aktif, tidak terpengaruh filter.
    prisma.competitionEntry.groupBy({
      by: ["disciplineId"],
      where: { competitionId, registration: REGISTERED },
      _count: { _all: true },
    }),
  ]);
  const athleteCount = await prisma.competitionRegistration.count({
    where: { competitionId, ...REGISTERED },
  });

  const perDiscipline = Object.fromEntries(
    summaryEntries.map((row) => [row.disciplineId, row._count._all]),
  );
  return {
    competition,
    rows,
    summary: {
      athletes: athleteCount,
      entries: summaryEntries.reduce((sum, row) => sum + row._count._all, 0),
      perDiscipline,
    },
  };
}

export type Roster = Awaited<ReturnType<typeof getRoster>>;

export async function recordRosterExport(actor: Actor, competitionId: string, format: string) {
  await writeAuditLog(prisma, {
    actorUserId: actor.userId,
    action: "competition_registration.exported",
    entityType: "Competition",
    entityId: competitionId,
    metadata: { format },
  });
}
