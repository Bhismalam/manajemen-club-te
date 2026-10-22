import { describe, expect, it } from "vitest";

import {
  compareSeed,
  diffDisciplines,
  escapeSpreadsheetValue,
  exceedsEntryLimit,
  groupByDiscipline,
  registrationDenyMessage,
  registrationWindowState,
  rosterFileName,
} from "./registrations";

describe("diffDisciplines", () => {
  it("memisahkan nomor yang ditambah dan dihapus", () => {
    expect(diffDisciplines(["a", "b"], ["b", "c"])).toEqual({ added: ["c"], removed: ["a"] });
    expect(diffDisciplines([], ["a"])).toEqual({ added: ["a"], removed: [] });
    expect(diffDisciplines(["a"], ["a"])).toEqual({ added: [], removed: [] });
  });
});

describe("exceedsEntryLimit", () => {
  it("tanpa batas selalu boleh", () => {
    expect(exceedsEntryLimit(10, null)).toBe(false);
  });
  it("batas inklusif", () => {
    expect(exceedsEntryLimit(3, 3)).toBe(false);
    expect(exceedsEntryLimit(4, 3)).toBe(true);
  });
});

describe("registrationWindowState", () => {
  const window = {
    registrationOpensAt: new Date("2026-10-20T00:00:00Z"),
    registrationClosesAt: new Date("2026-10-25T15:59:00Z"),
  };

  it("belum dibuka", () => {
    expect(registrationWindowState(window, new Date("2026-10-19T00:00:00Z"))).toMatchObject({
      state: "not_open",
    });
  });

  it("dibuka dengan sisa waktu", () => {
    expect(registrationWindowState(window, new Date("2026-10-22T15:00:00Z"))).toMatchObject({
      state: "open",
      label: "Tutup 3 hari lagi",
    });
    expect(registrationWindowState(window, new Date("2026-10-25T10:00:00Z"))).toMatchObject({
      label: "Tutup 5 jam lagi",
    });
    expect(registrationWindowState(window, new Date("2026-10-25T15:30:00Z"))).toMatchObject({
      label: "Segera ditutup",
    });
  });

  it("ditutup setelah deadline atau tanpa periode", () => {
    expect(registrationWindowState(window, new Date("2026-10-25T16:00:00Z")).state).toBe("closed");
    expect(
      registrationWindowState({ registrationOpensAt: null, registrationClosesAt: null }, new Date())
        .state,
    ).toBe("closed");
  });
});

describe("compareSeed", () => {
  it("seed tercepat dulu, tanpa seed di akhir, lalu nama", () => {
    const rows = [
      { name: "Citra", seedTimeMs: null },
      { name: "Bima", seedTimeMs: 31_000 },
      { name: "Ayu", seedTimeMs: null },
      { name: "Dewi", seedTimeMs: 29_500 },
    ];
    expect(rows.sort(compareSeed).map((r) => r.name)).toEqual(["Dewi", "Bima", "Ayu", "Citra"]);
  });
});

describe("escapeSpreadsheetValue", () => {
  it("memberi prefix pada nilai yang bisa dibaca sebagai formula", () => {
    for (const value of ["=HYPERLINK(1)", "+1", "-1", "@SUM(A1)", "\tx", "\rx"]) {
      expect(escapeSpreadsheetValue(value)).toBe(`'${value}`);
    }
  });
  it("nilai biasa tidak berubah", () => {
    expect(escapeSpreadsheetValue("Bima Aditya")).toBe("Bima Aditya");
    expect(escapeSpreadsheetValue("")).toBe("");
  });
});

describe("registrationDenyMessage", () => {
  it("setiap alasan punya pesan", () => {
    expect(registrationDenyMessage("REGISTRATION_CLOSED")).toMatch(/ditutup/);
  });
});

describe("groupByDiscipline", () => {
  it("mengelompokkan peserta per nomor sesuai urutan event dan seed time", () => {
    const rows = [
      { athlete: { fullName: "Bima" }, entries: [{ disciplineId: "free50", seedTimeMs: 30_000 }] },
      {
        athlete: { fullName: "Ayu" },
        entries: [
          { disciplineId: "free50", seedTimeMs: 29_000 },
          { disciplineId: "back50", seedTimeMs: null },
        ],
      },
    ];
    const groups = groupByDiscipline([{ id: "back50" }, { id: "free50" }, { id: "fly50" }], rows);
    expect(groups.map((g) => [g.discipline.id, g.participants.map((p) => p.name)])).toEqual([
      ["back50", ["Ayu"]],
      ["free50", ["Ayu", "Bima"]],
      ["fly50", []],
    ]);
  });
});

describe("rosterFileName", () => {
  it("slug ASCII dari nama event", () => {
    expect(rosterFileName("Kejuaraan Renang & Finswimming 2026!", "2026-10-22", "xlsx")).toBe(
      "pendaftar-kejuaraan-renang-finswimming-2026-2026-10-22.xlsx",
    );
    expect(rosterFileName("Lomba Café ∆", "2026-10-22", "pdf")).toBe(
      "pendaftar-lomba-cafe-2026-10-22.pdf",
    );
    expect(rosterFileName("***", "2026-10-22", "pdf")).toBe("pendaftar-event-2026-10-22.pdf");
  });
});
