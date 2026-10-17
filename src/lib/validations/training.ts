import { z } from "zod";

import { isValidDateString, optionalText } from "./common";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const trainingSessionSchema = z
  .object({
    trainingGroupId: z.string().min(1, "Pilih kelompok latihan."),
    title: z
      .string()
      .trim()
      .min(2, "Judul minimal 2 karakter.")
      .max(100, "Judul maksimal 100 karakter."),
    date: z.string().refine(isValidDateString, "Pilih tanggal latihan."),
    startTime: z.string().regex(TIME_PATTERN, "Isi jam mulai."),
    endTime: z.string().regex(TIME_PATTERN, "Isi jam selesai."),
    location: optionalText(120, "Lokasi"),
    notes: optionalText(1000, "Catatan"),
  })
  .refine((data) => !TIME_PATTERN.test(data.startTime) || data.endTime > data.startTime, {
    message: "Jam selesai harus setelah jam mulai.",
    path: ["endTime"],
  });
export type TrainingSessionInput = z.infer<typeof trainingSessionSchema>;

export const updateTrainingSessionSchema = trainingSessionSchema.and(
  z.object({ sessionId: z.string().min(1) }),
);
export type UpdateTrainingSessionInput = z.infer<typeof updateTrainingSessionSchema>;

// Filter daftar sesi dari query string. Default: mulai hari ini.
export const trainingSessionFilterSchema = z.object({
  group: z.string().trim().max(64).catch(""),
  from: z.string().refine(isValidDateString).optional().catch(undefined),
  to: z.string().refine(isValidDateString).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type TrainingSessionFilter = z.infer<typeof trainingSessionFilterSchema>;
