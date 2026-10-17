import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions/types";
import { emptyToNull } from "@/lib/validations/common";
import type { CoachListFilter, UpdateCoachInput } from "@/lib/validations/profiles";
import { diffForAudit, writeAuditLog } from "@/services/audit-log-service";

// Daftar pelatih (admin). Jumlah pelatih kecil, jadi tanpa paginasi.
export async function listCoaches(filter: CoachListFilter) {
  const where: Prisma.CoachProfileWhereInput = {
    deletedAt: null,
    ...(filter.status && { isActive: filter.status === "active" }),
    ...(filter.q && { fullName: { contains: filter.q, mode: "insensitive" } }),
  };
  return prisma.coachProfile.findMany({
    where,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      specialization: true,
      isActive: true,
      user: { select: { email: true } },
      trainingGroups: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { athletes: { where: { deletedAt: null } } } },
        },
      },
    },
  });
}

export async function getCoachDetail(coachId: string) {
  const coach = await prisma.coachProfile.findFirst({
    where: { id: coachId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      fullName: true,
      phone: true,
      specialization: true,
      isActive: true,
      createdAt: true,
      user: { select: { email: true, status: true } },
      trainingGroups: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { athletes: { where: { deletedAt: null } } } },
        },
      },
    },
  });
  if (!coach) throw new AppError("NOT_FOUND", "Pelatih tidak ditemukan.");
  return coach;
}

export type CoachOption = { id: string; fullName: string };

export async function listCoachOptions(): Promise<CoachOption[]> {
  return prisma.coachProfile.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
}

// Hanya admin (dipastikan oleh action). Nama akun ikut disamakan dengan nama profil.
export async function updateCoachProfile(actor: Actor, input: UpdateCoachInput) {
  const before = await prisma.coachProfile.findFirst({
    where: { id: input.coachId, deletedAt: null },
  });
  if (!before) throw new AppError("NOT_FOUND", "Pelatih tidak ditemukan.");

  const data = {
    fullName: input.fullName,
    phone: emptyToNull(input.phone),
    specialization: emptyToNull(input.specialization),
    isActive: input.isActive,
  };

  await prisma.$transaction(async (tx) => {
    await tx.coachProfile.update({ where: { id: input.coachId }, data });
    await tx.user.update({ where: { id: before.userId }, data: { name: input.fullName } });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "coach.updated",
      entityType: "CoachProfile",
      entityId: input.coachId,
      metadata: diffForAudit(before, data),
    });
  });
}
