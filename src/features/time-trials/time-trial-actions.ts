"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { recordTimeTrialsSchema, updateTimeTrialSchema } from "@/lib/validations/time-trials";
import type { RecordedResult } from "@/services/time-trial-service";
import { deleteTimeTrial, recordTimeTrials, updateTimeTrial } from "@/services/time-trial-service";

// Admin & pelatih; atlet yang boleh dicatat dicek per atlet di service.

export async function recordTimeTrialsAction(
  input: unknown,
): Promise<ActionResult<RecordedResult[]>> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = recordTimeTrialsSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    const results = await recordTimeTrials(actor, parsed.data);
    const newPbs = results.filter((result) => result.isNewPb).length;
    return ok(
      results,
      `${results.length} time trial disimpan${newPbs > 0 ? `, ${newPbs} PB baru` : ""}.`,
    );
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTimeTrialAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = updateTimeTrialSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    const { isCurrentPb } = await updateTimeTrial(actor, parsed.data);
    refresh();
    return ok(undefined, isCurrentPb ? "Disimpan. Ini PB atlet saat ini." : "Time trial disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTimeTrialAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = z.object({ timeTrialId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await deleteTimeTrial(actor, parsed.data.timeTrialId);
    return ok(undefined, "Time trial dihapus. PB diperbarui.");
  } catch (error) {
    return toActionError(error);
  }
}
