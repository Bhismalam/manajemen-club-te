import { z } from "zod";

import { emailField, idField, nameField, ROLE_VALUES, USER_STATUS_VALUES } from "./common";
import {
  athleteNumberField,
  athleteProfileFields,
  checkAthleteDates,
  coachProfileFields,
} from "./profiles";

// Satu form untuk semua role; field profil hanya wajib sesuai role yang dipilih.
export const createUserSchema = z
  .object({
    role: z.enum(ROLE_VALUES, "Pilih role."),
    name: nameField,
    email: emailField,
    ...coachProfileFields,
    ...athleteProfileFields,
    // Divalidasi ulang di superRefine hanya untuk role ATHLETE.
    athleteNumber: z.string().trim(),
    gender: z.enum(["", "MALE", "FEMALE"]),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "ATHLETE") return;

    const number = athleteNumberField.safeParse(data.athleteNumber);
    if (!number.success) {
      ctx.addIssue({
        code: "custom",
        message: number.error.issues[0]?.message ?? "Nomor atlet tidak valid.",
        path: ["athleteNumber"],
      });
    }
    if (!data.gender) {
      ctx.addIssue({ code: "custom", message: "Pilih jenis kelamin.", path: ["gender"] });
    }
    checkAthleteDates(data, ctx);
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserAccountSchema = z.object({
  userId: idField,
  name: nameField,
  email: emailField,
});
export type UpdateUserAccountInput = z.infer<typeof updateUserAccountSchema>;

export const setUserStatusSchema = z
  .object({
    userId: idField,
    status: z.enum(USER_STATUS_VALUES),
    reason: z.string().trim().max(200, "Alasan maksimal 200 karakter."),
  })
  .superRefine((data, ctx) => {
    if (data.status !== "ACTIVE" && data.reason.length < 3) {
      ctx.addIssue({
        code: "custom",
        message: "Tulis alasan minimal 3 karakter.",
        path: ["reason"],
      });
    }
  });
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export const setUserRoleSchema = z.object({
  userId: idField,
  role: z.enum(ROLE_VALUES),
});
export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;

// Filter daftar pengguna dari query string (?q=&role=&status=&page=).
export const userListFilterSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  role: z.enum(ROLE_VALUES).optional().catch(undefined),
  status: z.enum(USER_STATUS_VALUES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type UserListFilter = z.infer<typeof userListFilterSchema>;
