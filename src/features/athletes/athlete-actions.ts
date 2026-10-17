"use server";

import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { updateAthleteSchema } from "@/lib/validations/profiles";
import { updateAthleteProfile } from "@/services/athlete-service";

// Edit profil atlet: hanya admin (coach & atlet hanya melihat).
export async function updateAthleteAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN");
  const parsed = updateAthleteSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);

  try {
    await updateAthleteProfile(actor, parsed.data);
    return ok(undefined, "Profil atlet disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}
