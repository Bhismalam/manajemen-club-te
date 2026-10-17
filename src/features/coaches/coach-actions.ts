"use server";

import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { updateCoachSchema } from "@/lib/validations/profiles";
import { updateCoachProfile } from "@/services/coach-service";

// Edit profil pelatih: hanya admin.
export async function updateCoachAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN");
  const parsed = updateCoachSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);

  try {
    await updateCoachProfile(actor, parsed.data);
    return ok(undefined, "Profil pelatih disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}
