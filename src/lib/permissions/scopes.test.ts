import { describe, expect, it } from "vitest";

import { athleteScope } from "./scopes";
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
