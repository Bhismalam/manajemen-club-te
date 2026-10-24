import { describe, expect, it } from "vitest";

import { canRecordResults, compareResults, medalForRank, seedDelta } from "./race-results";
import { resultRowSchema, saveResultsSchema } from "./validations/race-results";

const nov7 = new Date("2026-11-07T00:00:00Z");

describe("canRecordResults", () => {
  it("event berlangsung & selesai boleh", () => {
    expect(canRecordResults({ status: "ONGOING", startDate: nov7 }, "2026-11-07")).toBe(true);
    expect(canRecordResults({ status: "COMPLETED", startDate: nov7 }, "2026-12-01")).toBe(true);
  });
  it("event akan datang hanya jika tanggal mulai sudah tiba", () => {
    expect(canRecordResults({ status: "UPCOMING", startDate: nov7 }, "2026-11-06")).toBe(false);
    expect(canRecordResults({ status: "UPCOMING", startDate: nov7 }, "2026-11-07")).toBe(true);
  });
  it("draft & batal tidak boleh", () => {
    expect(canRecordResults({ status: "DRAFT", startDate: nov7 }, "2026-12-01")).toBe(false);
    expect(canRecordResults({ status: "CANCELLED", startDate: nov7 }, "2026-12-01")).toBe(false);
  });
});

describe("medalForRank", () => {
  it("1–3 di final mendapat medali", () => {
    expect(medalForRank(1, "TIME_FINAL")).toBe("GOLD");
    expect(medalForRank(2, "FINAL")).toBe("SILVER");
    expect(medalForRank(3, "FINAL")).toBe("BRONZE");
    expect(medalForRank(4, "FINAL")).toBe("NONE");
  });
  it("heat & semifinal tanpa medali", () => {
    expect(medalForRank(1, "HEAT")).toBe("NONE");
    expect(medalForRank(1, "SEMIFINAL")).toBe("NONE");
    expect(medalForRank(null, "FINAL")).toBe("NONE");
  });
});

describe("compareResults", () => {
  it("finish tercepat dulu, lalu DSQ, DNF, DNS", () => {
    const rows = [
      { id: "dns", status: "DNS" as const, durationMs: null },
      { id: "slow", status: "FINISHED" as const, durationMs: 32_000 },
      { id: "dsq", status: "DSQ" as const, durationMs: null },
      { id: "fast", status: "FINISHED" as const, durationMs: 30_000 },
      { id: "dnf", status: "DNF" as const, durationMs: null },
    ];
    expect(rows.sort(compareResults).map((r) => r.id)).toEqual([
      "fast",
      "slow",
      "dsq",
      "dnf",
      "dns",
    ]);
  });
});

describe("seedDelta", () => {
  it("selisih terhadap seed hanya untuk hasil finish", () => {
    expect(seedDelta({ status: "FINISHED", durationMs: 30_550 }, 31_000)).toBe(-450);
    expect(seedDelta({ status: "FINISHED", durationMs: 30_550 }, null)).toBeNull();
    expect(seedDelta({ status: "DNF", durationMs: null }, 31_000)).toBeNull();
  });
});

const row = {
  entryId: "e1",
  status: "FINISHED",
  time: "31.20",
  rank: "2",
  medal: "SILVER",
  note: "",
};
const firstPath = (input: object) => {
  const result = resultRowSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.path[0];
};

describe("resultRowSchema", () => {
  it("menerima hasil finish yang valid", () => {
    expect(resultRowSchema.safeParse(row).success).toBe(true);
    expect(resultRowSchema.safeParse({ ...row, rank: "", medal: "NONE" }).success).toBe(true);
  });
  it("finish wajib punya waktu valid", () => {
    expect(firstPath({ ...row, time: "" })).toBe("time");
    expect(firstPath({ ...row, time: "0" })).toBe("time");
    expect(firstPath({ ...row, time: "1:75.00" })).toBe("time");
  });
  it("DNS/DNF/DSQ tanpa waktu, peringkat, medali", () => {
    expect(
      resultRowSchema.safeParse({ ...row, status: "DNS", time: "", rank: "", medal: "NONE" })
        .success,
    ).toBe(true);
    expect(firstPath({ ...row, status: "DSQ", rank: "", medal: "NONE" })).toBe("time");
    expect(firstPath({ ...row, status: "DNF", time: "", medal: "NONE" })).toBe("rank");
    expect(firstPath({ ...row, status: "DNF", time: "", rank: "" })).toBe("medal");
  });
  it("peringkat bilangan bulat 1–999", () => {
    expect(firstPath({ ...row, rank: "0" })).toBe("rank");
    expect(firstPath({ ...row, rank: "1.5" })).toBe("rank");
  });
  it("status kosong = hapus hasil, field lain diabaikan", () => {
    expect(resultRowSchema.safeParse({ ...row, status: "", time: "abc" }).success).toBe(true);
  });
});

describe("saveResultsSchema", () => {
  it("menolak baris dobel", () => {
    expect(
      saveResultsSchema.safeParse({ competitionId: "c", round: "FINAL", rows: [row, row] }).success,
    ).toBe(false);
  });
});
