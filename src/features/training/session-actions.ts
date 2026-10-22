"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { trainingSessionSchema, updateTrainingSessionSchema } from "@/lib/validations/training";
import {
  createTrainingSession,
  deleteTrainingSession,
  updateTrainingSession,
} from "@/services/training-session-service";

// Admin & pelatih; batas kelompok yang boleh dikelola dicek di service.

export async function createTrainingSessionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = trainingSessionSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    return ok(await createTrainingSession(actor, parsed.data), "Sesi latihan dibuat.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTrainingSessionAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = updateTrainingSessionSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await updateTrainingSession(actor, parsed.data);
    refresh();
    return ok(undefined, "Sesi latihan disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTrainingSessionAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = z.object({ sessionId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await deleteTrainingSession(actor, parsed.data.sessionId);
    return ok(undefined, "Sesi latihan dihapus.");
  } catch (error) {
    return toActionError(error);
  }
}
