import { z } from "zod";

import { GENDER_VALUES, isValidDateString, optionalText } from "./common";

// Field profil atlet & pelatih, dipakai di form tambah pengguna dan edit profil.

export const athleteNumberField = z
  .string()
  .trim()
  .min(1, "Nomor atlet wajib diisi.")
  .max(30, "Nomor atlet maksimal 30 karakter.")
  .regex(/^[A-Za-z0-9-]+$/, "Nomor atlet hanya boleh huruf, angka, dan tanda hubung.");

export const athleteProfileFields = {
  athleteNumber: athleteNumberField,
  birthDate: z.string(),
  gender: z.enum(GENDER_VALUES, "Pilih jenis kelamin."),
  joinDate: z.string(),
  phone: optionalText(30, "Nomor HP"),
  trainingGroupId: z.string(),
};

export const coachProfileFields = {
  phone: optionalText(30, "Nomor HP"),
  specialization: optionalText(100, "Spesialisasi"),
};

type DateCheckContext = {
  addIssue: (issue: { code: "custom"; message: string; path: string[] }) => void;
};

// Tanggal lahir & bergabung: wajib, valid, tidak di masa depan, bergabung setelah lahir.
export function checkAthleteDates(
  data: { birthDate: string; joinDate: string },
  ctx: DateCheckContext,
  today: string = new Date().toISOString().slice(0, 10),
) {
  if (!isValidDateString(data.birthDate)) {
    ctx.addIssue({ code: "custom", message: "Tanggal lahir wajib diisi.", path: ["birthDate"] });
  } else if (data.birthDate > today) {
    ctx.addIssue({
      code: "custom",
      message: "Tanggal lahir tidak boleh di masa depan.",
      path: ["birthDate"],
    });
  }

  if (!isValidDateString(data.joinDate)) {
    ctx.addIssue({ code: "custom", message: "Tanggal bergabung wajib diisi.", path: ["joinDate"] });
  } else if (data.joinDate > today) {
    ctx.addIssue({
      code: "custom",
      message: "Tanggal bergabung tidak boleh di masa depan.",
      path: ["joinDate"],
    });
  } else if (isValidDateString(data.birthDate) && data.joinDate < data.birthDate) {
    ctx.addIssue({
      code: "custom",
      message: "Tanggal bergabung harus setelah tanggal lahir.",
      path: ["joinDate"],
    });
  }
}

export const updateAthleteSchema = z
  .object({
    athleteId: z.string().min(1),
    fullName: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter.")
      .max(100, "Nama maksimal 100 karakter."),
    ...athleteProfileFields,
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => checkAthleteDates(data, ctx));
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>;

export const updateCoachSchema = z.object({
  coachId: z.string().min(1),
  fullName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter."),
  ...coachProfileFields,
  isActive: z.boolean(),
});
export type UpdateCoachInput = z.infer<typeof updateCoachSchema>;

// Filter daftar dari query string.
export const athleteListFilterSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  group: z.string().trim().max(64).catch(""),
  status: z.enum(["active", "inactive"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type AthleteListFilter = z.infer<typeof athleteListFilterSchema>;

export const coachListFilterSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(["active", "inactive"]).optional().catch(undefined),
});
export type CoachListFilter = z.infer<typeof coachListFilterSchema>;
