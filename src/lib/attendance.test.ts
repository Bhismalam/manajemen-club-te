import { describe, expect, it } from "vitest";

import { canRecordAttendanceOn, summarizeAttendance } from "./attendance";

describe("summarizeAttendance", () => {
  it("menghitung tiap status dan persentase hadir", () => {
    expect(summarizeAttendance(["PRESENT", "PRESENT", "SICK", "ABSENT"])).toEqual({
      PRESENT: 2,
      PERMISSION: 0,
      SICK: 1,
      ABSENT: 1,
      total: 4,
      rate: 50,
    });
  });

  it("dibulatkan ke persen terdekat", () => {
    expect(summarizeAttendance(["PRESENT", "PRESENT", "PERMISSION"]).rate).toBe(67);
  });

  it("tanpa catatan: rate null", () => {
    expect(summarizeAttendance([]).rate).toBeNull();
  });
});

describe("canRecordAttendanceOn", () => {
  const now = new Date("2026-10-20T03:00:00Z"); // 11:00 WITA, 20 Okt

  it("boleh untuk sesi hari ini (walau belum mulai) dan sebelumnya", () => {
    expect(canRecordAttendanceOn(new Date("2026-10-20T09:00:00Z"), now)).toBe(true); // 17:00 WITA
    expect(canRecordAttendanceOn(new Date("2026-10-18T09:00:00Z"), now)).toBe(true);
  });

  it("tidak boleh untuk sesi besok (WITA)", () => {
    // 21 Okt 05:00 WITA = 20 Okt 21:00 UTC — masih "20 Okt" di UTC tapi besok di WITA.
    expect(canRecordAttendanceOn(new Date("2026-10-20T21:00:00Z"), now)).toBe(false);
  });
});
