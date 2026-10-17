"use server";

import { headers } from "next/headers";

import { requireAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import {
  createUserSchema,
  setUserRoleSchema,
  setUserStatusSchema,
  updateUserAccountSchema,
} from "@/lib/validations/users";
import {
  createUser,
  setUserRole,
  setUserStatus,
  updateUserAccount,
} from "@/services/user-admin-service";

// Setiap action: requireAdmin (login + role + MFA) → validasi Zod di server → service.

export async function createUserAction(
  input: unknown,
): Promise<ActionResult<{ userId: string; temporaryPassword: string }>> {
  const admin = await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);

  try {
    return ok(await createUser(admin, parsed.data, await headers()), "Pengguna dibuat.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserAccountAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = updateUserAccountSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);

  try {
    await updateUserAccount(admin, parsed.data, await headers());
    return ok(undefined, "Data akun disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserStatusAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = setUserStatusSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);

  try {
    await setUserStatus(admin, parsed.data, await headers());
    return ok(undefined, "Status akun diperbarui.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserRoleAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = setUserRoleSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);

  try {
    await setUserRole(admin, parsed.data, await headers());
    return ok(undefined, "Role diperbarui.");
  } catch (error) {
    return toActionError(error);
  }
}
