import { describe, expect, it } from "vitest";

import { ageOn, formatDate, formatDateTime, toDateInputValue } from "./format";

describe("format", () => {
  it("tanggal saja tidak bergeser hari", () => {
    expect(formatDate(new Date("2011-04-12T00:00:00Z"))).toBe("12 Apr 2011");
    expect(toDateInputValue(new Date("2011-04-12T00:00:00Z"))).toBe("2011-04-12");
  });

  it("timestamp ditampilkan dalam WIB", () => {
    // 17:30 UTC = 00:30 WIB hari berikutnya
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
