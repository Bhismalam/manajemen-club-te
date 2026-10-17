"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { ActionResult } from "@/lib/errors";
import { fail, ok } from "@/lib/errors";
import { resetUserMfa } from "@/services/mfa-service";

const resetMfaSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(3, "Alasan minimal 3 karakter.").max(200),
});

// Admin mereset MFA user lain (mis. HP hilang dan recovery code habis).
// UI-nya dipasang di halaman detail user (Phase 5).
export async function resetUserMfaAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = resetMfaSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Input tidak valid.");
  }

  // Admin tidak boleh mereset MFA miliknya sendiri (itu sama dengan mematikan MFA wajib).
  if (parsed.data.userId === admin.id) {
    return fail("FORBIDDEN", "Tidak bisa mereset MFA akun sendiri. Minta admin lain.");
  }

  try {
    await resetUserMfa(prisma, {
      targetUserId: parsed.data.userId,
      actorUserId: admin.id,
      reason: parsed.data.reason,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return fail("NOT_FOUND", "User tidak ditemukan.");
    }
    throw error;
  }

  return ok(undefined, "MFA direset. User harus login ulang dan mengaktifkan MFA kembali.");
}
