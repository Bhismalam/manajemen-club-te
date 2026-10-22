import { z } from "zod";

import { GENDER_VALUES, idField } from "./common";

const disciplineIdsField = z
  .array(idField)
  .min(1, "Pilih minimal satu nomor lomba.")
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, "Nomor lomba tidak boleh dobel.");

// Atlet mendaftarkan dirinya sendiri: athleteId TIDAK diterima dari form (diambil dari session).
export const myRegistrationSchema = z.object({
  competitionId: idField,
  disciplineIds: disciplineIdsField,
});
export type MyRegistrationInput = z.infer<typeof myRegistrationSchema>;

export const myRegistrationCancelSchema = z.object({ competitionId: idField });

// Pelatih / admin mendaftarkan atlet tertentu; izin atas atlet dicek di service.
export const athleteRegistrationSchema = myRegistrationSchema.extend({ athleteId: idField });
export type AthleteRegistrationInput = z.infer<typeof athleteRegistrationSchema>;

export const athleteRegistrationCancelSchema = z.object({
  competitionId: idField,
  athleteId: idField,
});

export const ROSTER_VIEWS = ["athlete", "discipline"] as const;

// Filter rekap pendaftar dari query string.
export const rosterFilterSchema = z.object({
  view: z.enum(ROSTER_VIEWS).catch("athlete"),
  discipline: z.string().trim().max(64).catch(""),
  gender: z.enum(GENDER_VALUES).optional().catch(undefined),
  q: z.string().trim().max(100).catch(""),
  cancelled: z
    .enum(["1"])
    .optional()
    .catch(undefined)
    .transform((value) => value === "1"),
});
export type RosterFilter = z.infer<typeof rosterFilterSchema>;

export const exportFormatSchema = z.enum(["xlsx", "pdf"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;
