import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions/types";
import { emptyToNull } from "@/lib/validations/common";
import type { TrainingGroupInput, UpdateTrainingGroupInput } from "@/lib/validations/groups";
import { diffForAudit, writeAuditLog } from "@/services/audit-log-service";

// Pelatih sebuah kelompok = pembina semua atlet di kelompok itu (dasar izin coach).
// Mengubah / mengosongkan pelatih langsung mengubah akses data atlet.

export type GroupOption = { id: string; name: string };

// Pilihan kelompok latihan untuk form (urut nama).
export async function listTrainingGroupOptions(): Promise<GroupOption[]> {
  return prisma.trainingGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listTrainingGroups() {
  return prisma.trainingGroup.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      coach: { select: { id: true, fullName: true, isActive: true } },
      _count: { select: { athletes: { where: { deletedAt: null } }, sessions: true } },
    },
  });
}

export async function getTrainingGroup(groupId: string) {
  const group = await prisma.trainingGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      description: true,
      coachId: true,
      coach: { select: { id: true, fullName: true } },
      athletes: {
        where: { deletedAt: null },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, athleteNumber: true, isActive: true },
      },
      _count: { select: { sessions: true } },
    },
  });
  if (!group) throw new AppError("NOT_FOUND", "Kelompok latihan tidak ditemukan.");
  return group;
}

async function assertNameAvailable(name: string, exceptId?: string) {
  const existing = await prisma.trainingGroup.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing && existing.id !== exceptId) {
    throw new AppError("CONFLICT", "Nama kelompok sudah dipakai.", "name");
  }
}

async function resolveCoachId(raw: string): Promise<string | null> {
  const coachId = emptyToNull(raw);
  if (!coachId) return null;
  const coach = await prisma.coachProfile.findFirst({
    where: { id: coachId, deletedAt: null, isActive: true },
    select: { id: true },
  });
  if (!coach)
    throw new AppError("VALIDATION_ERROR", "Pelatih tidak ditemukan atau nonaktif.", "coachId");
  return coach.id;
}

export async function createTrainingGroup(actor: Actor, input: TrainingGroupInput) {
  await assertNameAvailable(input.name);
  const data = {
    name: input.name,
    description: emptyToNull(input.description),
    coachId: await resolveCoachId(input.coachId),
  };

  return prisma.$transaction(async (tx) => {
    const group = await tx.trainingGroup.create({ data, select: { id: true } });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "training_group.created",
      entityType: "TrainingGroup",
      entityId: group.id,
      metadata: { name: data.name, coachId: data.coachId },
    });
    return group;
  });
}

export async function updateTrainingGroup(actor: Actor, input: UpdateTrainingGroupInput) {
  const before = await prisma.trainingGroup.findUnique({ where: { id: input.groupId } });
  if (!before) throw new AppError("NOT_FOUND", "Kelompok latihan tidak ditemukan.");
  await assertNameAvailable(input.name, input.groupId);

  const data = {
    name: input.name,
    description: emptyToNull(input.description),
    coachId: await resolveCoachId(input.coachId),
  };

  await prisma.$transaction(async (tx) => {
    await tx.trainingGroup.update({ where: { id: input.groupId }, data });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "training_group.updated",
      entityType: "TrainingGroup",
      entityId: input.groupId,
      metadata: diffForAudit(before, data),
    });
  });
}

// Hanya kelompok kosong (tanpa atlet & sesi latihan) yang boleh dihapus, agar riwayat tidak hilang.
export async function deleteTrainingGroup(actor: Actor, groupId: string) {
  const group = await prisma.trainingGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, _count: { select: { athletes: true, sessions: true } } },
  });
  if (!group) throw new AppError("NOT_FOUND", "Kelompok latihan tidak ditemukan.");
  if (group._count.athletes > 0 || group._count.sessions > 0) {
    throw new AppError(
      "CONFLICT",
      "Kelompok masih punya atlet atau sesi latihan. Pindahkan atlet ke kelompok lain dulu.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.trainingGroup.delete({ where: { id: groupId } });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "training_group.deleted",
      entityType: "TrainingGroup",
      entityId: groupId,
      metadata: { name: group.name },
    });
  });
}
