import { z } from "zod";

import { toClubDateInput } from "@/lib/format";

import { idField, isValidDateString, optionalText } from "./common";

const TEXT_MAX = 2000;

function requiredText(label: string) {
  return z
    .string()
    .trim()
    .min(3, `${label} minimal 3 karakter.`)
    .max(TEXT_MAX, `${label} maksimal ${TEXT_MAX} karakter.`);
}

// Tanggal evaluasi: valid dan tidak di masa depan (jam klub).
const evaluationDateField = z
  .string()
  .refine(isValidDateString, "Pilih tanggal evaluasi.")
  .refine((value) => value <= toClubDateInput(new Date()), "Tanggal tidak boleh di masa depan.");

const evaluationFields = {
  evaluationDate: evaluationDateField,
  strengths: requiredText("Kekuatan"),
  weaknesses: requiredText("Kekurangan"),
  focus: requiredText("Fokus perbaikan"),
  target: requiredText("Target berikutnya"),
  notes: optionalText(TEXT_MAX, "Catatan"),
};

// Pelatih memilih atlet binaan; izin atas atlet dicek di service.
export const createEvaluationSchema = z.object({
  athleteId: z.string().min(1, "Pilih atlet.").max(64),
  ...evaluationFields,
});
export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;

// Atlet evaluasi tidak bisa dipindah saat edit.
export const updateEvaluationSchema = z.object({
  evaluationId: idField,
  ...evaluationFields,
});
export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>;

export const evaluationFilterSchema = z.object({
  athlete: z.string().trim().max(64).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type EvaluationFilter = z.infer<typeof evaluationFilterSchema>;
