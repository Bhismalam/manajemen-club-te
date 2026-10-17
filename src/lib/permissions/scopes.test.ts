import { describe, expect, it } from "vitest";

import { athleteScope, manageableGroupScope, trainingSessionScope } from "./scopes";
import type { Actor } from "./types";

describe("athleteScope", () => {
  it("admin: semua atlet yang belum dihapus", () => {
    const actor: Actor = { userId: "u", role: "ADMIN", athleteId: null, coachId: null };
    expect(athleteScope(actor)).toEqual({ deletedAt: null });
  });

  it("coach: hanya atlet di group miliknya", () => {
    const actor: Actor = { userId: "u", role: "COACH", athleteId: null, coachId: "coach-a" };
    expect(athleteScope(actor)).toEqual({ deletedAt: null, trainingGroup: { coachId: "coach-a" } });
  });

  it("atlet: hanya dirinya sendiri", () => {
    const actor: Actor = { userId: "u", role: "ATHLETE", athleteId: "ath-1", coachId: null };
    expect(athleteScope(actor)).toEqual({ id: "ath-1" });
  });

  it("tanpa profil aktif: tidak cocok dengan atlet mana pun", () => {
    const noMatch = { id: { in: [] } };
    expect(athleteScope({ userId: "u", role: "COACH", athleteId: null, coachId: null })).toEqual(
      noMatch,
    );
    expect(athleteScope({ userId: "u", role: "ATHLETE", athleteId: null, coachId: null })).toEqual(
      noMatch,
    );
  });
});

describe("trainingSessionScope", () => {
  const none = { id: { in: [] } };

  it("admin semua, coach kelompok miliknya, atlet kelompoknya", () => {
    expect(
      trainingSessionScope({ userId: "u", role: "ADMIN", athleteId: null, coachId: null }),
    ).toEqual({});
    expect(
      trainingSessionScope({ userId: "u", role: "COACH", athleteId: null, coachId: "c1" }),
    ).toEqual({
      trainingGroup: { coachId: "c1" },
    });
    expect(
      trainingSessionScope({ userId: "u", role: "ATHLETE", athleteId: "a1", coachId: null }),
    ).toEqual({
      trainingGroup: { athletes: { some: { id: "a1" } } },
    });
  });

  it("tanpa profil aktif: kosong", () => {
    expect(
      trainingSessionScope({ userId: "u", role: "COACH", athleteId: null, coachId: null }),
    ).toEqual(none);
    expect(
      trainingSessionScope({ userId: "u", role: "ATHLETE", athleteId: null, coachId: null }),
    ).toEqual(none);
  });
});

describe("manageableGroupScope", () => {
  it("atlet tidak pernah mengelola kelompok", () => {
    expect(
      manageableGroupScope({ userId: "u", role: "ATHLETE", athleteId: "a1", coachId: null }),
    ).toEqual({
      id: { in: [] },
    });
    expect(
      manageableGroupScope({ userId: "u", role: "COACH", athleteId: null, coachId: "c1" }),
    ).toEqual({
      coachId: "c1",
    });
  });
});
