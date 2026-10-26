"use server";

import { refresh } from "next/cache";

import type { ActionResult } from "@/lib/errors";
import { fail, ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import {
  athleteRegistrationCancelSchema,
  athleteRegistrationSchema,
  myRegistrationCancelSchema,
  myRegistrationSchema,
} from "@/lib/validations/registrations";
import type { SaveRegistrationResult } from "@/services/competition-registration-service";
import {
  cancelRegistration,
  rosterPath,
  saveRegistration,
} from "@/services/competition-registration-service";
import { markNotificationsRead } from "@/services/notification-service";
import { enforceRateLimit } from "@/services/rate-limit-service";

const SAVE_MESSAGE: Record<SaveRegistrationResult["outcome"], string> = {
  created: "Pendaftaran berhasil. Admin sudah diberi tahu.",
  updated: "Pendaftaran diperbarui.",
  unchanged: "Tidak ada perubahan.",
};

const NO_PROFILE = "Profil atlet kamu belum aktif. Hubungi admin.";

// --- Atlet: selalu dirinya sendiri. athleteId tidak pernah diambil dari input.

export async function saveMyRegistrationAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ATHLETE");
  const parsed = myRegistrationSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  if (!actor.athleteId) return fail("FORBIDDEN", NO_PROFILE);
  try {
    await enforceRateLimit("registration", actor.userId);
    const { outcome } = await saveRegistration(actor, {
      ...parsed.data,
      athleteId: actor.athleteId,
    });
    refresh();
    return ok(undefined, SAVE_MESSAGE[outcome]);
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelMyRegistrationAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ATHLETE");
  const parsed = myRegistrationCancelSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  if (!actor.athleteId) return fail("FORBIDDEN", NO_PROFILE);
  try {
    await enforceRateLimit("registration", actor.userId);
    await cancelRegistration(actor, { ...parsed.data, athleteId: actor.athleteId });
    refresh();
    return ok(undefined, "Pendaftaran dibatalkan.");
  } catch (error) {
    return toActionError(error);
  }
}

// --- Pelatih (atlet binaan) & admin (semua atlet); izin per atlet dicek di service.

export async function saveAthleteRegistrationAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = athleteRegistrationSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("registration", actor.userId);
    const { outcome } = await saveRegistration(actor, parsed.data);
    refresh();
    return ok(undefined, SAVE_MESSAGE[outcome]);
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelAthleteRegistrationAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = athleteRegistrationCancelSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("registration", actor.userId);
    await cancelRegistration(actor, parsed.data);
    refresh();
    return ok(undefined, "Pendaftaran dibatalkan.");
  } catch (error) {
    return toActionError(error);
  }
}

// --- Notifikasi admin

export async function markRosterNotificationsReadAction(competitionId: unknown) {
  const actor = await requireActor("ADMIN");
  if (typeof competitionId !== "string" || competitionId.length > 64) return;
  const count = await markNotificationsRead(actor.userId, rosterPath(competitionId));
  if (count > 0) refresh();
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const actor = await requireActor("ADMIN");
  await markNotificationsRead(actor.userId);
  refresh();
  return ok(undefined, "Semua notifikasi ditandai sudah dibaca.");
}
