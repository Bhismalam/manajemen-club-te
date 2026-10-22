"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { saveAttendanceSchema } from "@/lib/validations/attendance";
import { saveSessionAttendance } from "@/services/attendance-service";

// Admin & pelatih kelompok; kelompok, tanggal sesi, dan anggota dicek di service.
export async function saveAttendanceAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = saveAttendanceSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await saveSessionAttendance(actor, parsed.data);
    refresh();
    return ok(undefined, "Absensi disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}
