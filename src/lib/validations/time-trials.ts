import { z } from "zod";

import { parseDuration } from "@/lib/duration";
import { toClubDateInput } from "@/lib/format";

import { isValidDateString, optionalText } from "./common";

export const TIME_FORMAT_HINT = "Format waktu: 58.27 atau 1:05.32.";

const timeField = z.string().refine((value) => parseDuration(value) !== null, TIME_FORMAT_HINT);

// Tanggal time trial: valid dan tidak di masa depan (jam klub).
const trialDateField = z
  .string()
  .refine(isValidDateString, "Pilih tanggal.")
  .refine((value) => value <= toClubDateInput(new Date()), "Tanggal tidak boleh di masa depan.");

export const recordTimeTrialsSchema = z
  .object({
    disciplineId: z.string().min(1, "Pilih nomor lomba."),
    date: trialDateField,
    trainingSessionId: z.string(),
    entries: z
      .array(
        z.object({
          athleteId: z.string().min(1, "Pilih atlet."),
          time: timeField,
          note: optionalText(200, "Catatan"),
        }),
      )
      .min(1, "Isi minimal satu atlet.")
      .max(50, "Maksimal 50 atlet sekali simpan."),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.entries.forEach((entry, index) => {
      if (entry.athleteId && seen.has(entry.athleteId)) {
        ctx.addIssue({
          code: "custom",
          message: "Atlet ini sudah ada di baris lain.",
          path: ["entries", index, "athleteId"],
        });
      }
      seen.add(entry.athleteId);
    });
  });
export type RecordTimeTrialsInput = z.infer<typeof recordTimeTrialsSchema>;

export const updateTimeTrialSchema = z.object({
  timeTrialId: z.string().min(1),
  date: trialDateField,
  time: timeField,
  note: optionalText(200, "Catatan"),
});
export type UpdateTimeTrialInput = z.infer<typeof updateTimeTrialSchema>;

export const timeTrialFilterSchema = z.object({
  athlete: z.string().trim().max(64).catch(""),
  discipline: z.string().trim().max(64).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type TimeTrialFilter = z.infer<typeof timeTrialFilterSchema>;
