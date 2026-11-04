import { describe, expect, it } from "vitest";

import {
  addMonths,
  arrearsMonths,
  billingStartMonth,
  currentClubMonth,
  displayStatus,
  firstRateMonth,
  formatMonth,
  isValidMonth,
  monthsBetween,
  periodProblem,
  rateForMonth,
} from "./spp";

const date = (value: string) => new Date(`${value}T00:00:00Z`);

describe("bulan", () => {
  it("memvalidasi format YYYY-MM", () => {
    expect(isValidMonth("2026-11")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-00")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
    expect(isValidMonth("")).toBe(false);
  });

  it("memakai kalender WITA untuk bulan berjalan", () => {
    expect(currentClubMonth(new Date("2026-10-31T15:59:00Z"))).toBe("2026-10");
    expect(currentClubMonth(new Date("2026-10-31T16:30:00Z"))).toBe("2026-11");
  });

  it("menghitung lintas tahun", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(monthsBetween("2026-11", "2027-01")).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(monthsBetween("2027-01", "2026-11")).toEqual([]);
  });

  it("menampilkan nama bulan Indonesia", () => {
    expect(formatMonth("2026-11")).toBe("November 2026");
  });
});

describe("tarif", () => {
  const rates = [
    { month: "2026-01", amount: 200_000 },
    { month: "2026-07", amount: 250_000 },
  ];

  it("memilih tarif terbaru yang sudah efektif", () => {
    expect(rateForMonth(rates, "2025-12")).toBeNull();
    expect(rateForMonth(rates, "2026-01")).toBe(200_000);
    expect(rateForMonth(rates, "2026-06")).toBe(200_000);
    expect(rateForMonth(rates, "2026-07")).toBe(250_000);
    expect(rateForMonth(rates, "2027-01")).toBe(250_000);
  });

  it("menemukan bulan tarif pertama", () => {
    expect(firstRateMonth([...rates].reverse())).toBe("2026-01");
    expect(firstRateMonth([])).toBeNull();
  });
});

describe("status", () => {
  it("menyamakan ditolak & dibatalkan dengan belum bayar", () => {
    expect(displayStatus("PAID")).toBe("PAID");
    expect(displayStatus("PENDING")).toBe("PENDING");
    expect(displayStatus("REJECTED")).toBe("UNPAID");
    expect(displayStatus("CANCELLED")).toBe("UNPAID");
    expect(displayStatus(null)).toBe("UNPAID");
  });
});

describe("tunggakan", () => {
  const base = { joinDate: date("2026-03-15"), firstRateMonth: "2026-01", currentMonth: "2026-06" };

  it("mulai dari bulan bergabung bila setelah tarif pertama", () => {
    expect(billingStartMonth(date("2026-03-15"), "2026-01")).toBe("2026-03");
    expect(billingStartMonth(date("2025-03-15"), "2026-01")).toBe("2026-01");
  });

  it("tidak menghitung bulan berjalan", () => {
    expect(arrearsMonths({ ...base, settledMonths: [] })).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
  });

  it("melewati bulan yang lunas atau menunggu konfirmasi", () => {
    expect(arrearsMonths({ ...base, settledMonths: ["2026-03", "2026-05"] })).toEqual(["2026-04"]);
  });

  it("kosong jika tarif belum diatur atau atlet baru bergabung", () => {
    expect(arrearsMonths({ ...base, firstRateMonth: null, settledMonths: [] })).toEqual([]);
    expect(arrearsMonths({ ...base, joinDate: date("2026-06-01"), settledMonths: [] })).toEqual([]);
  });
});

describe("bulan yang boleh dibayar", () => {
  const base = { joinDate: date("2026-03-15"), firstRateMonth: "2026-01", currentMonth: "2026-06" };

  it("menolak sebelum awal tagihan", () => {
    expect(periodProblem({ ...base, month: "2026-02" })).toContain("Maret 2026");
    expect(periodProblem({ ...base, month: "2026-03" })).toBeNull();
  });

  it("membatasi pembayaran di muka", () => {
    expect(periodProblem({ ...base, month: "2027-06" })).toBeNull();
    expect(periodProblem({ ...base, month: "2027-07" })).toContain("12 bulan");
  });
});
