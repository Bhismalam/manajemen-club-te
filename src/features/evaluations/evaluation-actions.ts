"use server";

import { refresh } from "next/cache";

import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { createEvaluationSchema, updateEvaluationSchema } from "@/lib/validations/evaluations";
import { createEvaluation, updateEvaluation } from "@/services/evaluation-service";

// Menulis evaluasi: pelatih saja. Mengubah: admin atau pelatih penulis (dicek di service).

export async function createEvaluationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireActor("COACH");
  const parsed = createEvaluationSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    return ok(await createEvaluation(actor, parsed.data), "Evaluasi disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateEvaluationAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = updateEvaluationSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    const { changed } = await updateEvaluation(actor, parsed.data);
    if (changed) refresh();
    return ok(undefined, changed ? "Evaluasi diperbarui." : "Tidak ada perubahan.");
  } catch (error) {
    return toActionError(error);
  }
}
