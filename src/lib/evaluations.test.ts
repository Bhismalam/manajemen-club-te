import { describe, expect, it } from "vitest";

import { isEvaluationDue } from "./evaluations";

describe("isEvaluationDue", () => {
  const now = new Date("2026-10-25T04:00:00Z");

  it("belum pernah dievaluasi", () => {
    expect(isEvaluationDue(null, now)).toBe(true);
  });

  it("evaluasi 30 hari terakhir masih berlaku", () => {
    expect(isEvaluationDue(new Date("2026-10-01T00:00:00Z"), now)).toBe(false);
    expect(isEvaluationDue(new Date("2026-09-26T00:00:00Z"), now)).toBe(false);
  });

  it("lebih dari 30 hari perlu dievaluasi lagi", () => {
    expect(isEvaluationDue(new Date("2026-09-24T00:00:00Z"), now)).toBe(true);
  });
});
