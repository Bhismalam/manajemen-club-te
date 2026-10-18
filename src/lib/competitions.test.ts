import { describe, expect, it } from "vitest";

import {
  allowedTransitions,
  isEditableStatus,
  publishBlockers,
  transitionBlocker,
} from "./competitions";

const ready = {
  registrationOpensAt: new Date("2026-10-20T00:00:00Z"),
  registrationClosesAt: new Date("2026-11-01T15:59:00Z"),
  disciplineCount: 2,
  registrationCount: 0,
};

describe("publishBlockers", () => {
  it("siap jika periode pendaftaran & nomor lomba ada", () => {
    expect(publishBlockers(ready)).toEqual([]);
  });

  it("menyebut semua syarat yang kurang", () => {
    expect(
      publishBlockers({
        registrationOpensAt: null,
        registrationClosesAt: null,
        disciplineCount: 0,
      }),
    ).toHaveLength(2);
  });
});

describe("transitionBlocker", () => {
  it("publish draft yang siap", () => {
    expect(transitionBlocker("DRAFT", "UPCOMING", ready)).toBeNull();
  });

  it("publish ditolak jika syarat kurang", () => {
    expect(transitionBlocker("DRAFT", "UPCOMING", { ...ready, disciplineCount: 0 })).toMatch(
      /nomor lomba/,
    );
  });

  it("kembali ke draft hanya jika belum ada pendaftar", () => {
    expect(transitionBlocker("UPCOMING", "DRAFT", ready)).toBeNull();
    expect(transitionBlocker("UPCOMING", "DRAFT", { ...ready, registrationCount: 1 })).toMatch(
      /pendaftar/,
    );
  });

  it("menolak lompatan status yang tidak urut", () => {
    expect(transitionBlocker("DRAFT", "COMPLETED", ready)).not.toBeNull();
    expect(transitionBlocker("COMPLETED", "ONGOING", ready)).not.toBeNull();
    expect(allowedTransitions("COMPLETED")).toEqual([]);
  });

  it("selesai & batal tidak bisa diedit", () => {
    expect(isEditableStatus("ONGOING")).toBe(true);
    expect(isEditableStatus("COMPLETED")).toBe(false);
    expect(isEditableStatus("CANCELLED")).toBe(false);
  });
});
