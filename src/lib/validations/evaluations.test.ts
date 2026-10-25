import { describe, expect, it } from "vitest";

import { createEvaluationSchema, updateEvaluationSchema } from "./evaluations";

const valid = {
  athleteId: "ath1",
  evaluationDate: "2026-10-20",
  strengths: "Start dan underwater kuat.",
  weaknesses: "Pacing 50m kedua menurun.",
  focus: "Latihan pacing dengan interval 4×100m.",
  target: "100m Freestyle di bawah 1:05.00.",
  notes: "",
};

const firstPath = (input: object) => {
  const result = createEvaluationSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.path[0];
};

describe("createEvaluationSchema", () => {
  it("menerima evaluasi lengkap", () => {
    expect(createEvaluationSchema.safeParse(valid).success).toBe(true);
  });

  it("atlet wajib dipilih", () => {
    expect(firstPath({ ...valid, athleteId: "" })).toBe("athleteId");
  });

  it("empat isian utama wajib diisi", () => {
    for (const field of ["strengths", "weaknesses", "focus", "target"]) {
      expect(firstPath({ ...valid, [field]: "  " })).toBe(field);
    }
  });

  it("tanggal valid dan tidak di masa depan", () => {
    expect(firstPath({ ...valid, evaluationDate: "2026-02-30" })).toBe("evaluationDate");
    expect(firstPath({ ...valid, evaluationDate: "2999-01-01" })).toBe("evaluationDate");
  });

  it("isian maksimal 2000 karakter", () => {
    expect(firstPath({ ...valid, notes: "x".repeat(2001) })).toBe("notes");
  });
});

describe("updateEvaluationSchema", () => {
  it("tidak menerima pemindahan atlet", () => {
    const parsed = updateEvaluationSchema.safeParse({ ...valid, evaluationId: "e1" });
    expect(parsed.success && "athleteId" in parsed.data).toBe(false);
  });
});
