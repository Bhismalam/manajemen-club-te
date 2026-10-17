import { describe, expect, it } from "vitest";

import { describePbChange, pickPersonalBest } from "./personal-best";

const r = (id: string, durationMs: number, day: number) => ({
  sourceId: id,
  durationMs,
  achievedAt: new Date(Date.UTC(2026, 9, day)),
  sourceType: "TIME_TRIAL" as const,
});

describe("pickPersonalBest", () => {
  it("memilih waktu tercepat", () => {
    expect(pickPersonalBest([r("a", 31450, 1), r("b", 30990, 5), r("c", 31000, 3)])?.sourceId).toBe(
      "b",
    );
  });

  it("waktu sama: yang tercapai lebih dulu", () => {
    expect(pickPersonalBest([r("late", 30000, 9), r("early", 30000, 2)])?.sourceId).toBe("early");
  });

  it("tanpa hasil: null", () => {
    expect(pickPersonalBest([])).toBeNull();
  });
});

describe("describePbChange", () => {
  it("PB pertama", () => {
    expect(describePbChange(null, { durationMs: 31000, sourceId: "x" }, "x")).toEqual({
      previousMs: null,
      currentMs: 31000,
      isNewPb: true,
    });
  });

  it("lebih cepat dari PB lama", () => {
    expect(
      describePbChange({ durationMs: 31450 }, { durationMs: 31000, sourceId: "x" }, "x").isNewPb,
    ).toBe(true);
  });

  it("lebih lambat: PB tetap", () => {
    expect(
      describePbChange({ durationMs: 31000 }, { durationMs: 31000, sourceId: "old" }, "x").isNewPb,
    ).toBe(false);
  });

  it("menyamai PB lama bukan PB baru", () => {
    expect(
      describePbChange({ durationMs: 31000 }, { durationMs: 31000, sourceId: "old" }, "x").isNewPb,
    ).toBe(false);
  });
});
