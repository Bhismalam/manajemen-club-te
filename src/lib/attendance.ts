import type { AttendanceStatus } from "@/generated/prisma/enums";
import { toClubDateInput } from "@/lib/format";

export const ATTENDANCE_STATUSES = ["PRESENT", "PERMISSION", "SICK", "ABSENT"] as const;

export type AttendanceCounts = Record<AttendanceStatus, number> & {
  total: number;
  // Persentase hadir dari sesi yang tercatat (0–100), null jika belum ada catatan.
  rate: number | null;
};

export function summarizeAttendance(statuses: AttendanceStatus[]): AttendanceCounts {
  const counts: AttendanceCounts = {
    PRESENT: 0,
    PERMISSION: 0,
    SICK: 0,
    ABSENT: 0,
    total: 0,
    rate: null,
  };
  for (const status of statuses) {
    counts[status] += 1;
    counts.total += 1;
  }
  counts.rate = counts.total > 0 ? Math.round((counts.PRESENT / counts.total) * 100) : null;
  return counts;
}

// Absensi hanya bisa dicatat mulai hari sesi (jam klub), tidak untuk sesi di masa depan.
export function canRecordAttendanceOn(startsAt: Date, now = new Date()): boolean {
  return toClubDateInput(startsAt) <= toClubDateInput(now);
}
