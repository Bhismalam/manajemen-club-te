import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { requireAthleteAccess } from "@/lib/permissions/guards";
import { athleteScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import { dateOnly, emptyToNull } from "@/lib/validations/common";
import type { AthleteListFilter, UpdateAthleteInput } from "@/lib/validations/profiles";
import { diffForAudit, writeAuditLog } from "@/services/audit-log-service";

export const ATHLETE_PAGE_SIZE = 20;

// Daftar atlet sesuai scope actor (admin: semua, coach: binaan, atlet: diri sendiri).
export async function listAthletes(actor: Actor, filter: AthleteListFilter) {
  const where: Prisma.AthleteProfileWhereInput = {
    AND: [
      athleteScope(actor),
      filter.group === "none"
        ? { trainingGroupId: null }
        : filter.group
          ? { trainingGroupId: filter.group }
          : {},
      filter.status ? { isActive: filter.status === "active" } : {},
      filter.q
        ? {
            OR: [
              { fullName: { contains: filter.q, mode: "insensitive" } },
              { athleteNumber: { contains: filter.q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await prisma.$transaction([
    prisma.athleteProfile.count({ where }),
    prisma.athleteProfile.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (filter.page - 1) * ATHLETE_PAGE_SIZE,
      take: ATHLETE_PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        athleteNumber: true,
        gender: true,
        birthDate: true,
        isActive: true,
        trainingGroup: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { items, total, page: filter.page, pageSize: ATHLETE_PAGE_SIZE };
}

export async function getAthleteDetail(actor: Actor, athleteId: string) {
  await requireAthleteAccess(actor, athleteId, "view");
  const athlete = await prisma.athleteProfile.findUniqueOrThrow({
    where: { id: athleteId },
    select: {
      id: true,
      userId: true,
      fullName: true,
      athleteNumber: true,
      gender: true,
      birthDate: true,
      joinDate: true,
      phone: true,
      isActive: true,
      createdAt: true,
      trainingGroupId: true,
      trainingGroup: {
        select: { id: true, name: true, coach: { select: { id: true, fullName: true } } },
      },
      user: { select: { email: true, status: true } },
      _count: { select: { personalBests: true, timeTrials: true, attendances: true } },
    },
  });
  return athlete;
}

// Hanya admin (dipastikan oleh action). Nama akun ikut disamakan dengan nama profil.
export async function updateAthleteProfile(actor: Actor, input: UpdateAthleteInput) {
  const before = await prisma.athleteProfile.findFirst({
    where: { id: input.athleteId, deletedAt: null },
  });
  if (!before) throw new AppError("NOT_FOUND", "Atlet tidak ditemukan.");

  const numberOwner = await prisma.athleteProfile.findUnique({
    where: { athleteNumber: input.athleteNumber },
    select: { id: true },
  });
  if (numberOwner && numberOwner.id !== input.athleteId) {
    throw new AppError("CONFLICT", "Nomor atlet sudah dipakai.", "athleteNumber");
  }

  const trainingGroupId = emptyToNull(input.trainingGroupId);
  if (
    trainingGroupId &&
    !(await prisma.trainingGroup.findUnique({ where: { id: trainingGroupId } }))
  ) {
    throw new AppError("VALIDATION_ERROR", "Kelompok latihan tidak ditemukan.", "trainingGroupId");
  }

  const data = {
    fullName: input.fullName,
    athleteNumber: input.athleteNumber,
    birthDate: dateOnly(input.birthDate),
    joinDate: dateOnly(input.joinDate),
    gender: input.gender,
    phone: emptyToNull(input.phone),
    trainingGroupId,
    isActive: input.isActive,
  };

  await prisma.$transaction(async (tx) => {
    await tx.athleteProfile.update({ where: { id: input.athleteId }, data });
    await tx.user.update({ where: { id: before.userId }, data: { name: input.fullName } });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "athlete.updated",
      entityType: "AthleteProfile",
      entityId: input.athleteId,
      metadata: diffForAudit(before, data),
    });
  });
}
