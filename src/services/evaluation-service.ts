import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { canEditEvaluation, canManageAthletePerformance } from "@/lib/permissions/policies";
import { athleteScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import { dateOnly, emptyToNull } from "@/lib/validations/common";
import type {
  CreateEvaluationInput,
  EvaluationFilter,
  UpdateEvaluationInput,
} from "@/lib/validations/evaluations";
import { diffForAudit, writeAuditLog } from "@/services/audit-log-service";

// Evaluasi pelatih (doc/PRD.md §4.11). Pelatih menulis untuk atlet binaannya; atlet hanya
// membaca miliknya; admin membaca semua. Tidak ada hapus (riwayat pembinaan).

export const EVALUATION_PAGE_SIZE = 20;

const evaluationSelect = {
  id: true,
  evaluationDate: true,
  strengths: true,
  weaknesses: true,
  focus: true,
  target: true,
  notes: true,
  coachId: true,
  createdAt: true,
  updatedAt: true,
  athlete: {
    select: {
      id: true,
      fullName: true,
      athleteNumber: true,
      trainingGroup: { select: { name: true, coachId: true } },
    },
  },
  coach: { select: { fullName: true } },
} satisfies Prisma.CoachEvaluationSelect;

type EvaluationRow = Prisma.CoachEvaluationGetPayload<{ select: typeof evaluationSelect }>;

function withPermissions(actor: Actor, evaluation: EvaluationRow) {
  return {
    ...evaluation,
    canEdit: canEditEvaluation(actor, {
      coachId: evaluation.coachId,
      athlete: { coachId: evaluation.athlete.trainingGroup?.coachId ?? null },
    }),
  };
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

// Daftar evaluasi atlet dalam scope actor (coach: binaan, atlet: miliknya, admin: semua).
export async function listEvaluations(actor: Actor, filter: EvaluationFilter) {
  const where: Prisma.CoachEvaluationWhereInput = {
    AND: [{ athlete: athleteScope(actor) }, filter.athlete ? { athleteId: filter.athlete } : {}],
  };
  const [total, items] = await prisma.$transaction([
    prisma.coachEvaluation.count({ where }),
    prisma.coachEvaluation.findMany({
      where,
      orderBy: [{ evaluationDate: "desc" }, { createdAt: "desc" }],
      skip: (filter.page - 1) * EVALUATION_PAGE_SIZE,
      take: EVALUATION_PAGE_SIZE,
      select: evaluationSelect,
    }),
  ]);
  return {
    items: items.map((item) => withPermissions(actor, item)),
    total,
    page: filter.page,
    pageSize: EVALUATION_PAGE_SIZE,
  };
}

// Evaluasi di luar scope dianggap tidak ada (404).
export async function getEvaluation(actor: Actor, evaluationId: string) {
  const evaluation = await prisma.coachEvaluation.findFirst({
    where: { AND: [{ id: evaluationId }, { athlete: athleteScope(actor) }] },
    select: evaluationSelect,
  });
  if (!evaluation) throw new AppError("NOT_FOUND", "Evaluasi tidak ditemukan.");
  return withPermissions(actor, evaluation);
}

// Atlet binaan aktif yang boleh dievaluasi actor.
export async function listEvaluableAthletes(actor: Actor) {
  return prisma.athleteProfile.findMany({
    where: { AND: [athleteScope(actor), { isActive: true }] },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, trainingGroup: { select: { name: true } } },
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function toEvaluationData(input: Omit<CreateEvaluationInput, "athleteId">) {
  return {
    evaluationDate: dateOnly(input.evaluationDate),
    strengths: input.strengths,
    weaknesses: input.weaknesses,
    focus: input.focus,
    target: input.target,
    notes: emptyToNull(input.notes),
  };
}

// Hanya pelatih (dengan profil aktif) yang menulis evaluasi, untuk atlet binaannya yang aktif.
export async function createEvaluation(actor: Actor, input: CreateEvaluationInput) {
  if (actor.role !== "COACH" || !actor.coachId) {
    throw new AppError("FORBIDDEN", "Hanya pelatih yang bisa menulis evaluasi.");
  }
  const athlete = await prisma.athleteProfile.findFirst({
    where: { AND: [{ id: input.athleteId }, athleteScope(actor), { isActive: true }] },
    select: { id: true, fullName: true, trainingGroup: { select: { coachId: true } } },
  });
  if (
    !athlete ||
    !canManageAthletePerformance(actor, { coachId: athlete.trainingGroup?.coachId ?? null })
  ) {
    throw new AppError("FORBIDDEN", "Kamu hanya bisa mengevaluasi atlet binaanmu.", "athleteId");
  }

  const data = toEvaluationData(input);
  return prisma.$transaction(async (tx) => {
    const evaluation = await tx.coachEvaluation.create({
      data: { ...data, athleteId: athlete.id, coachId: actor.coachId! },
      select: { id: true },
    });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "evaluation.created",
      entityType: "CoachEvaluation",
      entityId: evaluation.id,
      metadata: { athleteId: athlete.id, evaluationDate: input.evaluationDate },
    });
    return evaluation;
  });
}

export async function updateEvaluation(actor: Actor, input: UpdateEvaluationInput) {
  const before = await getEvaluation(actor, input.evaluationId);
  if (!before.canEdit) {
    throw new AppError(
      "FORBIDDEN",
      "Evaluasi hanya bisa diubah oleh pelatih penulisnya selama masih membina atlet ini.",
    );
  }
  const data = toEvaluationData(input);
  const changes = diffForAudit(before, data);
  if (Object.keys(changes).length === 0) return { changed: false };

  await prisma.$transaction(async (tx) => {
    await tx.coachEvaluation.update({ where: { id: before.id }, data });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "evaluation.updated",
      entityType: "CoachEvaluation",
      entityId: before.id,
      metadata: { athleteId: before.athlete.id, fields: Object.keys(changes) },
    });
  });
  return { changed: true };
}
