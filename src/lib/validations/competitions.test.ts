import { describe, expect, it } from "vitest";

import { competitionSchema } from "./competitions";

const valid = {
  name: "Kejuaraan Renang Kota 2026",
  description: "",
  location: "Kolam Renang Kompyang Sujana",
  level: "REGIONAL",
  startDate: "2026-11-07",
  endDate: "2026-11-08",
  registrationOpensDate: "2026-10-20",
  registrationOpensTime: "08:00",
  registrationClosesDate: "2026-11-01",
  registrationClosesTime: "23:59",
  maxEntriesPerAthlete: "",
  disciplineIds: ["d1", "d2"],
};

const firstError = (input: object) => {
  const result = competitionSchema.safeParse(input);
  return result.success ? null : result.error.issues[0];
};

describe("competitionSchema", () => {
  it("menerima event yang valid", () => {
    expect(competitionSchema.safeParse(valid).success).toBe(true);
  });

  it("draft boleh tanpa periode pendaftaran dan tanpa nomor lomba", () => {
    const draft = {
      ...valid,
      registrationOpensDate: "",
      registrationClosesDate: "",
      disciplineIds: [],
    };
    expect(competitionSchema.safeParse(draft).success).toBe(true);
  });

  it("tanggal selesai tidak boleh sebelum tanggal mulai", () => {
    expect(firstError({ ...valid, endDate: "2026-11-06" })).toMatchObject({ path: ["endDate"] });
  });

  it("periode pendaftaran harus lengkap dan berurutan", () => {
    expect(firstError({ ...valid, registrationClosesDate: "" })).toMatchObject({
      path: ["registrationClosesDate"],
    });
    expect(firstError({ ...valid, registrationOpensTime: "" })).toMatchObject({
      path: ["registrationOpensTime"],
    });
    expect(
      firstError({
        ...valid,
        registrationClosesDate: "2026-10-20",
        registrationClosesTime: "08:00",
      }),
    ).toMatchObject({ path: ["registrationClosesDate"] });
  });

  it("pendaftaran ditutup paling lambat di hari mulai event", () => {
    expect(
      competitionSchema.safeParse({ ...valid, registrationClosesDate: "2026-11-07" }).success,
    ).toBe(true);
    expect(firstError({ ...valid, registrationClosesDate: "2026-11-08" })).toMatchObject({
      path: ["registrationClosesDate"],
    });
  });

  it("batas nomor per atlet 1–20 atau kosong", () => {
    expect(competitionSchema.safeParse({ ...valid, maxEntriesPerAthlete: "3" }).success).toBe(true);
    for (const value of ["0", "21", "2.5", "abc"]) {
      expect(firstError({ ...valid, maxEntriesPerAthlete: value })).toMatchObject({
        path: ["maxEntriesPerAthlete"],
      });
    }
  });

  it("nomor lomba tidak boleh dobel", () => {
    expect(firstError({ ...valid, disciplineIds: ["d1", "d1"] })).toMatchObject({
      path: ["disciplineIds"],
    });
  });

  it("level wajib dari daftar", () => {
    expect(firstError({ ...valid, level: "WORLD" })).toMatchObject({ path: ["level"] });
  });
});
