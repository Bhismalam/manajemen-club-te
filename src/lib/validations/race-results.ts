import { z } from "zod";

import { parseDuration } from "@/lib/duration";

import { idField, optionalText } from "./common";
import { TIME_FORMAT_HINT } from "./time-trials";

export const RESULT_STATUS_VALUES = ["FINISHED", "DNS", "DNF", "DSQ"] as const;
export const ROUND_VALUES = ["TIME_FINAL", "HEAT", "SEMIFINAL", "FINAL"] as const;
export const MEDAL_VALUES = ["NONE", "GOLD", "SILVER", "BRONZE"] as const;
export const MAX_RANK = 999;

// Satu baris hasil di lembar input. status "" = tidak ada hasil (hasil lama dihapus).
// Semua field berupa string dari form.
export const resultRowSchema = z
  .object({
    entryId: idField,
    status: z.enum(RESULT_STATUS_VALUES).or(z.literal("")),
    time: z.string().trim().max(12),
    rank: z.string().trim().max(4),
    medal: z.enum(MEDAL_VALUES),
    note: optionalText(200, "Catatan"),
  })
  .superRefine((row, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (row.status === "") return;

    if (row.status === "FINISHED") {
      if (parseDuration(row.time) === null) issue("time", TIME_FORMAT_HINT);
    } else {
      if (row.time !== "") issue("time", `Kosongkan waktu untuk ${row.status}.`);
      if (row.rank !== "") issue("rank", `Peringkat tidak diisi untuk ${row.status}.`);
      if (row.medal !== "NONE") issue("medal", `Tidak ada medali untuk ${row.status}.`);
      return;
    }

    if (row.rank !== "") {
      const rank = Number(row.rank);
      if (!Number.isInteger(rank) || rank < 1 || rank > MAX_RANK) {
        issue("rank", `Peringkat 1–${MAX_RANK}.`);
      }
    }
  });
export type ResultRowInput = z.infer<typeof resultRowSchema>;

export const saveResultsSchema = z.object({
  competitionId: idField,
  round: z.enum(ROUND_VALUES),
  rows: z
    .array(resultRowSchema)
    .min(1, "Tidak ada perubahan untuk disimpan.")
    .max(200)
    .refine((rows) => new Set(rows.map((r) => r.entryId)).size === rows.length, "Baris dobel."),
});
export type SaveResultsInput = z.infer<typeof saveResultsSchema>;

export const resultSheetFilterSchema = z.object({
  round: z.enum(ROUND_VALUES).catch("TIME_FINAL"),
  discipline: z.string().trim().max(64).catch(""),
});
export type ResultSheetFilter = z.infer<typeof resultSheetFilterSchema>;
