"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { trainingGroupSchema, updateTrainingGroupSchema } from "@/lib/validations/groups";
import {
  createTrainingGroup,
  deleteTrainingGroup,
  updateTrainingGroup,
} from "@/services/training-group-service";

// Kelompok latihan dikelola admin.

export async function createTrainingGroupAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireActor("ADMIN");
  const parsed = trainingGroupSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    return ok(await createTrainingGroup(actor, parsed.data), "Kelompok dibuat.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTrainingGroupAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN");
  const parsed = updateTrainingGroupSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await updateTrainingGroup(actor, parsed.data);
    refresh();
    return ok(undefined, "Kelompok disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTrainingGroupAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN");
  const parsed = z.object({ groupId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await deleteTrainingGroup(actor, parsed.data.groupId);
    return ok(undefined, "Kelompok dihapus.");
  } catch (error) {
    return toActionError(error);
  }
}
