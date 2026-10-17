import { describe, expect, it } from "vitest";

import {
  ageOn,
  clubDateTimeToUtc,
  clubDayRange,
  dateOnlyToClubInstant,
  formatClubDate,
  formatDate,
  formatDateTime,
  formatWeekdayDate,
  toClubDateInput,
  toClubTimeInput,
  toDateInputValue,
} from "./format";

describe("format", () => {
  it("tanggal saja tidak bergeser hari", () => {
    expect(formatDate(new Date("2011-04-12T00:00:00Z"))).toBe("12 Apr 2011");
    expect(toDateInputValue(new Date("2011-04-12T00:00:00Z"))).toBe("2011-04-12");
  });

  it("timestamp ditampilkan dalam WITA", () => {
    // 17:30 UTC = 01:30 WITA hari berikutnya
    expect(formatDateTime(new Date("2026-10-17T17:30:00Z"))).toContain("18 Okt 2026");
  });

  it("nilai kosong menjadi tanda strip", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("umur dihitung dari ulang tahun terakhir", () => {
    const birth = new Date("2011-04-12T00:00:00Z");
    expect(ageOn(birth, new Date("2026-04-11T00:00:00Z"))).toBe(14);
    expect(ageOn(birth, new Date("2026-04-12T00:00:00Z"))).toBe(15);
  });
});

describe("jam klub (WITA)", () => {
  it("input tanggal + jam WITA disimpan sebagai UTC", () => {
    expect(clubDateTimeToUtc("2026-10-20", "16:30").toISOString()).toBe("2026-10-20T08:30:00.000Z");
    expect(clubDateTimeToUtc("2026-10-20", "05:00").toISOString()).toBe("2026-10-19T21:00:00.000Z");
  });

  it("kembali ke tanggal & jam WITA untuk form edit", () => {
    const instant = new Date("2026-10-19T21:00:00.000Z");
    expect(toClubDateInput(instant)).toBe("2026-10-20");
    expect(toClubTimeInput(instant)).toBe("05:00");
  });

  it("nama hari mengikuti WITA", () => {
    expect(formatWeekdayDate(new Date("2026-10-19T21:00:00.000Z"))).toBe("Selasa, 20 Oktober 2026");
  });

  it("rentang satu hari WITA", () => {
    const { start, end } = clubDayRange("2026-10-20");
    expect(start.toISOString()).toBe("2026-10-19T16:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-20T16:00:00.000Z");
  });
});

describe("tanggal klub", () => {
  it("awal hari klub tidak bergeser ke hari sebelumnya", () => {
    // 15 Okt 00:00 WITA = 14 Okt 16:00 UTC
    expect(formatClubDate(new Date("2026-10-14T16:00:00Z"))).toBe("15 Okt 2026");
  });

  it("kolom tanggal-saja menjadi siang hari klub pada tanggal yang sama", () => {
    const instant = dateOnlyToClubInstant(new Date("2026-11-07T00:00:00Z"));
    expect(instant.toISOString()).toBe("2026-11-07T04:00:00.000Z");
    expect(formatClubDate(instant)).toBe("7 Nov 2026");
  });
});
