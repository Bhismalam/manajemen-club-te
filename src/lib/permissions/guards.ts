import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";

import { canEditTimeTrial, canManageAthletePerformance, canViewAthlete } from "./policies";
import type { Actor, AthleteRef } from "./types";

// Ownership guard: ambil fakta resource dari database lalu periksa izin.
// ID dari URL / form tidak pernah dianggap aman (doc/SECURITY.md §4).

async function findAthleteRef(athleteId: string): Promise<AthleteRef | null> {
  const athlete = await prisma.athleteProfile.findFirst({
    where: { id: athleteId, deletedAt: null },
    select: { id: true, isActive: true, trainingGroup: { select: { coachId: true } } },
  });
  if (!athlete) return null;
  return {
    id: athlete.id,
    isActive: athlete.isActive,
    coachId: athlete.trainingGroup?.coachId ?? null,
  };
}

export async function requireAthleteAccess(
  actor: Actor,
  athleteId: string,
  mode: "view" | "manage",
): Promise<AthleteRef> {
  const athlete = await findAthleteRef(athleteId);
  if (!athlete) throw new AppError("NOT_FOUND", "Atlet tidak ditemukan.");

  const allowed =
    mode === "view" ? canViewAthlete(actor, athlete) : canManageAthletePerformance(actor, athlete);
  if (!allowed) throw new AppError("FORBIDDEN", "Kamu tidak punya akses ke data atlet ini.");
  return athlete;
}

export async function requireTimeTrialEditAccess(actor: Actor, timeTrialId: string) {
  const timeTrial = await prisma.timeTrial.findUnique({
    where: { id: timeTrialId },
    select: { id: true, athlete: { select: { trainingGroup: { select: { coachId: true } } } } },
  });
  if (!timeTrial) throw new AppError("NOT_FOUND", "Time trial tidak ditemukan.");

  const allowed = canEditTimeTrial(actor, {
    athlete: { coachId: timeTrial.athlete.trainingGroup?.coachId ?? null },
  });
  if (!allowed) throw new AppError("FORBIDDEN", "Kamu tidak boleh mengubah time trial ini.");
  return timeTrial;
}
