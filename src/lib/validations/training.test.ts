import { describe, expect, it } from "vitest";

import { trainingSessionSchema } from "./training";

const valid = {
  trainingGroupId: "g1",
  title: "Latihan endurance",
  date: "2026-10-20",
  startTime: "16:00",
  endTime: "18:00",
  location: "Kolam utama",
  notes: "",
};

const firstError = (input: object) => {
  const result = trainingSessionSchema.safeParse(input);
  return result.success ? null : result.error.issues[0];
};

describe("trainingSessionSchema", () => {
  it("menerima sesi yang valid", () => {
    expect(trainingSessionSchema.safeParse(valid).success).toBe(true);
  });

  it("jam selesai harus setelah jam mulai", () => {
    expect(firstError({ ...valid, endTime: "16:00" })).toMatchObject({ path: ["endTime"] });
    expect(firstError({ ...valid, endTime: "15:30" })).toMatchObject({ path: ["endTime"] });
  });

  it("menolak jam & tanggal tidak valid", () => {
    expect(firstError({ ...valid, startTime: "24:00" })).toMatchObject({ path: ["startTime"] });
    expect(firstError({ ...valid, date: "2026-02-30" })).toMatchObject({ path: ["date"] });
  });

  it("kelompok wajib dipilih", () => {
    expect(firstError({ ...valid, trainingGroupId: "" })).toMatchObject({
      path: ["trainingGroupId"],
    });
  });
});
