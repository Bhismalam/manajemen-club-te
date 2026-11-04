import { describe, expect, it } from "vitest";

import {
  recordSppPaymentSchema,
  setSppRateSchema,
  sppBoardFilterSchema,
  sppReviewNoteSchema,
  submitSppPaymentSchema,
} from "./spp";

const payment = {
  month: "2026-11",
  amount: 250_000,
  method: "TRANSFER",
  paidOn: "2026-11-03",
  note: "",
};

describe("setSppRateSchema", () => {
  it("menerima tarif valid", () => {
    expect(setSppRateSchema.safeParse({ month: "2026-11", amount: 250_000 }).success).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN, 100_000_001])("menolak nominal %s", (amount) => {
    expect(setSppRateSchema.safeParse({ month: "2026-11", amount }).success).toBe(false);
  });

  it("menolak bulan tidak valid", () => {
    expect(setSppRateSchema.safeParse({ month: "2026-13", amount: 1000 }).success).toBe(false);
  });
});

describe("recordSppPaymentSchema", () => {
  it("bukti opsional", () => {
    expect(recordSppPaymentSchema.safeParse({ ...payment, athleteId: "a1" }).success).toBe(true);
  });

  it("wajib punya atlet dan tanggal valid", () => {
    expect(recordSppPaymentSchema.safeParse(payment).success).toBe(false);
    expect(
      recordSppPaymentSchema.safeParse({ ...payment, athleteId: "a1", paidOn: "2026-02-30" })
        .success,
    ).toBe(false);
  });
});

describe("submitSppPaymentSchema", () => {
  it("bukti wajib", () => {
    expect(submitSppPaymentSchema.safeParse(payment).success).toBe(false);
    expect(
      submitSppPaymentSchema.safeParse({ ...payment, proofKey: "k", proofName: "bukti.jpg" })
        .success,
    ).toBe(true);
  });

  it("membuang athleteId dari input", () => {
    const parsed = submitSppPaymentSchema.parse({
      ...payment,
      athleteId: "atlet-lain",
      proofKey: "k",
      proofName: "bukti.jpg",
    });
    expect(parsed).not.toHaveProperty("athleteId");
  });
});

describe("sppReviewNoteSchema", () => {
  it("alasan wajib", () => {
    expect(sppReviewNoteSchema.safeParse({ paymentId: "p1", note: "  " }).success).toBe(false);
    expect(sppReviewNoteSchema.safeParse({ paymentId: "p1", note: "Foto buram" }).success).toBe(
      true,
    );
  });
});

describe("sppBoardFilterSchema", () => {
  it("mengabaikan nilai URL yang tidak valid", () => {
    expect(sppBoardFilterSchema.parse({ month: "abc", status: "X", page: "-3" })).toEqual({
      month: undefined,
      group: "",
      status: undefined,
      q: "",
      page: 1,
    });
  });
});
