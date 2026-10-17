import { z } from "zod";

export const trainingGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama kelompok minimal 2 karakter.")
    .max(60, "Nama kelompok maksimal 60 karakter."),
  description: z.string().trim().max(300, "Deskripsi maksimal 300 karakter."),
  coachId: z.string(),
});
export type TrainingGroupInput = z.infer<typeof trainingGroupSchema>;

export const updateTrainingGroupSchema = trainingGroupSchema.extend({ groupId: z.string().min(1) });
export type UpdateTrainingGroupInput = z.infer<typeof updateTrainingGroupSchema>;
