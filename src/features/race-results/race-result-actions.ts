"use server";

import { refresh } from "next/cache";

import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { saveResultsSchema } from "@/lib/validations/race-results";
import type { SaveResultsSummary } from "@/services/race-result-service";
import { saveResults } from "@/services/race-result-service";

function summaryMessage({ created, updated, deleted }: SaveResultsSummary) {
  const parts = [
    created > 0 && `${created} hasil baru`,
    updated > 0 && `${updated} diubah`,
    deleted > 0 && `${deleted} dihapus`,
  ].filter(Boolean);
  return parts.length > 0 ? `Tersimpan: ${parts.join(", ")}.` : "Tidak ada perubahan.";
}

// Admin & pelatih; batas atlet (binaan) dan status event dicek di service.
export async function saveResultsAction(input: unknown): Promise<ActionResult<SaveResultsSummary>> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = saveResultsSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    const summary = await saveResults(actor, parsed.data);
    refresh();
    return ok(summary, summaryMessage(summary));
  } catch (error) {
    return toActionError(error);
  }
}
