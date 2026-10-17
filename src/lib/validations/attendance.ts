import { z } from "zod";

import { ATTENDANCE_STATUSES } from "@/lib/attendance";

import { isValidDateString, optionalText } from "./common";

export const saveAttendanceSchema = z
  .object({
    sessionId: z.string().min(1),
    entries: z
      .array(
        z.object({
          athleteId: z.string().min(1),
          status: z.enum(ATTENDANCE_STATUSES, "Pilih status kehadiran."),
          note: optionalText(200, "Catatan"),
        }),
      )
      .min(1, "Tandai kehadiran minimal satu atlet.")
      .max(300),
  })
  .refine((data) => new Set(data.entries.map((e) => e.athleteId)).size === data.entries.length, {
    message: "Atlet yang sama tercatat dua kali.",
    path: ["entries"],
  });
export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;

// Rekap absensi: default 30 hari terakhir.
export const attendanceSummaryFilterSchema = z.object({
  group: z.string().trim().max(64).catch(""),
  from: z.string().refine(isValidDateString).optional().catch(undefined),
  to: z.string().refine(isValidDateString).optional().catch(undefined),
});
export type AttendanceSummaryFilter = z.infer<typeof attendanceSummaryFilterSchema>;
