import { describe, expect, it } from "vitest";

import {
  canCreateCompetition,
  canEditEvaluation,
  canEditTimeTrial,
  canExportRegistrations,
  canManageAthletePerformance,
  canManageCompetition,
  canManageTrainingGroup,
  canManageUsers,
  canRegisterAthlete,
  canViewAthlete,
  canViewCompetition,
  canViewRegistration,
  isRegistrationOpen,
} from "./policies";
import type { Actor, AthleteRef, CompetitionRef } from "./types";

// --- Fixtures --------------------------------------------------------------

const admin: Actor = { userId: "u-admin", role: "ADMIN", athleteId: null, coachId: null };
const coachA: Actor = { userId: "u-coach-a", role: "COACH", athleteId: null, coachId: "coach-a" };
const coachB: Actor = { userId: "u-coach-b", role: "COACH", athleteId: null, coachId: "coach-b" };
// Akun coach yang profilnya nonaktif / belum dibuat.
const coachNoProfile: Actor = {
  userId: "u-coach-x",
  role: "COACH",
  athleteId: null,
  coachId: null,
};
const athlete1User: Actor = {
  userId: "u-ath-1",
  role: "ATHLETE",
  athleteId: "ath-1",
  coachId: null,
};
const athlete2User: Actor = {
  userId: "u-ath-2",
  role: "ATHLETE",
  athleteId: "ath-2",
  coachId: null,
};
const athleteNoProfile: Actor = {
  userId: "u-ath-x",
  role: "ATHLETE",
  athleteId: null,
  coachId: null,
};

// ath-1 dibina coach A, ath-2 dibina coach B, ath-3 belum punya group.
const ath1: AthleteRef = { id: "ath-1", coachId: "coach-a", isActive: true };
const ath2: AthleteRef = { id: "ath-2", coachId: "coach-b", isActive: true };
const ath3NoGroup: AthleteRef = { id: "ath-3", coachId: null, isActive: true };

const NOW = new Date("2026-10-17T10:00:00Z");
const day = (offset: number) => new Date(NOW.getTime() + offset * 24 * 60 * 60 * 1000);

const openCompetition: CompetitionRef = {
  status: "UPCOMING",
  createdById: "u-admin",
  registrationOpensAt: day(-1),
  registrationClosesAt: day(7),
};

// --- Users -----------------------------------------------------------------

describe("canManageUsers", () => {
  it("hanya admin", () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageUsers(coachA)).toBe(false);
    expect(canManageUsers(athlete1User)).toBe(false);
  });
});

// --- Athlete data ----------------------------------------------------------

describe("canViewAthlete", () => {
  it("admin melihat semua atlet", () => {
    expect(canViewAthlete(admin, ath1)).toBe(true);
    expect(canViewAthlete(admin, ath3NoGroup)).toBe(true);
  });

  it("coach hanya melihat atlet binaannya", () => {
    expect(canViewAthlete(coachA, ath1)).toBe(true);
    expect(canViewAthlete(coachA, ath2)).toBe(false);
    expect(canViewAthlete(coachA, ath3NoGroup)).toBe(false);
  });

  it("coach tanpa profil aktif tidak melihat atlet mana pun, termasuk atlet tanpa group", () => {
    expect(canViewAthlete(coachNoProfile, ath1)).toBe(false);
    expect(canViewAthlete(coachNoProfile, ath3NoGroup)).toBe(false);
  });

  it("atlet hanya melihat dirinya sendiri (IDOR)", () => {
    expect(canViewAthlete(athlete1User, ath1)).toBe(true);
    expect(canViewAthlete(athlete1User, ath2)).toBe(false);
    expect(canViewAthlete(athleteNoProfile, ath1)).toBe(false);
  });
});

describe("canManageAthletePerformance / canEditTimeTrial", () => {
  it("admin dan coach pembina boleh, coach lain tidak", () => {
    expect(canManageAthletePerformance(admin, ath2)).toBe(true);
    expect(canManageAthletePerformance(coachA, ath1)).toBe(true);
    expect(canManageAthletePerformance(coachB, ath1)).toBe(false);
    expect(canEditTimeTrial(coachA, { athlete: ath1 })).toBe(true);
    expect(canEditTimeTrial(coachA, { athlete: ath2 })).toBe(false);
  });

  it("atlet tidak boleh mengubah data performanya sendiri", () => {
    expect(canManageAthletePerformance(athlete1User, ath1)).toBe(false);
    expect(canEditTimeTrial(athlete1User, { athlete: ath1 })).toBe(false);
  });
});

describe("canEditEvaluation", () => {
  const evaluationByA = { coachId: "coach-a", athlete: ath1 };

  it("admin dan coach penulis yang masih membina atlet", () => {
    expect(canEditEvaluation(admin, evaluationByA)).toBe(true);
    expect(canEditEvaluation(coachA, evaluationByA)).toBe(true);
  });

  it("coach lain dan atlet tidak boleh", () => {
    expect(canEditEvaluation(coachB, evaluationByA)).toBe(false);
    expect(canEditEvaluation(athlete1User, evaluationByA)).toBe(false);
  });

  it("coach penulis kehilangan akses jika atlet pindah ke group coach lain", () => {
    expect(canEditEvaluation(coachA, { coachId: "coach-a", athlete: ath2 })).toBe(false);
  });
});

// --- Training --------------------------------------------------------------

describe("canManageTrainingGroup", () => {
  it("admin semua group, coach hanya group miliknya", () => {
    expect(canManageTrainingGroup(admin, { coachId: "coach-b" })).toBe(true);
    expect(canManageTrainingGroup(coachA, { coachId: "coach-a" })).toBe(true);
    expect(canManageTrainingGroup(coachA, { coachId: "coach-b" })).toBe(false);
    expect(canManageTrainingGroup(coachNoProfile, { coachId: null })).toBe(false);
    expect(canManageTrainingGroup(athlete1User, { coachId: "coach-a" })).toBe(false);
  });
});

// --- Competition -----------------------------------------------------------

describe("competition management", () => {
  const byCoachA = { ...openCompetition, createdById: "u-coach-a" };
  const draftByCoachA = { ...byCoachA, status: "DRAFT" as const };

  it("admin & coach boleh membuat event, atlet tidak", () => {
    expect(canCreateCompetition(admin)).toBe(true);
    expect(canCreateCompetition(coachA)).toBe(true);
    expect(canCreateCompetition(athlete1User)).toBe(false);
  });

  it("coach hanya mengelola event buatannya", () => {
    expect(canManageCompetition(admin, byCoachA)).toBe(true);
    expect(canManageCompetition(coachA, byCoachA)).toBe(true);
    expect(canManageCompetition(coachB, byCoachA)).toBe(false);
  });

  it("event DRAFT hanya terlihat oleh pengelolanya", () => {
    expect(canViewCompetition(coachA, draftByCoachA)).toBe(true);
    expect(canViewCompetition(admin, draftByCoachA)).toBe(true);
    expect(canViewCompetition(coachB, draftByCoachA)).toBe(false);
    expect(canViewCompetition(athlete1User, draftByCoachA)).toBe(false);
    expect(canViewCompetition(athlete1User, byCoachA)).toBe(true);
  });
});

describe("isRegistrationOpen", () => {
  it("terbuka hanya saat UPCOMING dan di dalam periode", () => {
    expect(isRegistrationOpen(openCompetition, NOW)).toBe(true);
    expect(isRegistrationOpen({ ...openCompetition, status: "ONGOING" }, NOW)).toBe(false);
    expect(isRegistrationOpen({ ...openCompetition, registrationOpensAt: day(1) }, NOW)).toBe(
      false,
    );
    expect(isRegistrationOpen({ ...openCompetition, registrationClosesAt: day(-1) }, NOW)).toBe(
      false,
    );
    expect(isRegistrationOpen({ ...openCompetition, registrationClosesAt: null }, NOW)).toBe(false);
  });

  it("batas periode bersifat inklusif", () => {
    expect(isRegistrationOpen(openCompetition, openCompetition.registrationClosesAt as Date)).toBe(
      true,
    );
  });
});

describe("canRegisterAthlete", () => {
  const closed = { ...openCompetition, registrationClosesAt: day(-1) };
  const draft = { ...openCompetition, status: "DRAFT" as const };
  const ongoing = { ...openCompetition, status: "ONGOING" as const };
  const completed = { ...openCompetition, status: "COMPLETED" as const };

  it("atlet mendaftarkan dirinya sendiri saat pendaftaran dibuka", () => {
    expect(canRegisterAthlete(athlete1User, ath1, openCompetition, NOW)).toEqual({ allowed: true });
  });

  it("atlet tidak boleh mendaftarkan atlet lain", () => {
    expect(canRegisterAthlete(athlete1User, ath2, openCompetition, NOW)).toEqual({
      allowed: false,
      reason: "FORBIDDEN",
    });
  });

  it("coach hanya untuk atlet binaannya", () => {
    expect(canRegisterAthlete(coachA, ath1, openCompetition, NOW).allowed).toBe(true);
    expect(canRegisterAthlete(coachA, ath2, openCompetition, NOW)).toEqual({
      allowed: false,
      reason: "FORBIDDEN",
    });
  });

  it("atlet & coach ditolak setelah deadline atau sebelum dibuka", () => {
    expect(canRegisterAthlete(athlete1User, ath1, closed, NOW)).toEqual({
      allowed: false,
      reason: "REGISTRATION_CLOSED",
    });
    expect(canRegisterAthlete(coachA, ath1, closed, NOW)).toEqual({
      allowed: false,
      reason: "REGISTRATION_CLOSED",
    });
  });

  it("atlet & coach ditolak untuk event DRAFT / ONGOING", () => {
    expect(canRegisterAthlete(athlete1User, ath1, draft, NOW)).toEqual({
      allowed: false,
      reason: "COMPETITION_NOT_OPEN",
    });
    expect(canRegisterAthlete(coachA, ath1, ongoing, NOW)).toEqual({
      allowed: false,
      reason: "COMPETITION_NOT_OPEN",
    });
  });

  it("admin boleh setelah deadline dan saat ONGOING, tapi tidak untuk DRAFT / COMPLETED", () => {
    expect(canRegisterAthlete(admin, ath2, closed, NOW).allowed).toBe(true);
    expect(canRegisterAthlete(admin, ath2, ongoing, NOW).allowed).toBe(true);
    expect(canRegisterAthlete(admin, ath2, draft, NOW)).toEqual({
      allowed: false,
      reason: "COMPETITION_NOT_OPEN",
    });
    expect(canRegisterAthlete(admin, ath2, completed, NOW)).toEqual({
      allowed: false,
      reason: "COMPETITION_NOT_OPEN",
    });
  });

  it("atlet nonaktif tidak bisa didaftarkan siapa pun", () => {
    const inactive = { ...ath1, isActive: false };
    for (const actor of [admin, coachA, athlete1User]) {
      expect(canRegisterAthlete(actor, inactive, openCompetition, NOW)).toEqual({
        allowed: false,
        reason: "ATHLETE_INACTIVE",
      });
    }
  });

  it("izin dicek sebelum status atlet, agar tidak membocorkan info atlet lain", () => {
    expect(
      canRegisterAthlete(athlete2User, { ...ath1, isActive: false }, openCompetition, NOW),
    ).toEqual({
      allowed: false,
      reason: "FORBIDDEN",
    });
  });
});

describe("registrations", () => {
  it("melihat pendaftaran mengikuti akses ke atlet", () => {
    expect(canViewRegistration(admin, { athlete: ath2 })).toBe(true);
    expect(canViewRegistration(coachA, { athlete: ath1 })).toBe(true);
    expect(canViewRegistration(coachA, { athlete: ath2 })).toBe(false);
    expect(canViewRegistration(athlete1User, { athlete: ath1 })).toBe(true);
    expect(canViewRegistration(athlete1User, { athlete: ath2 })).toBe(false);
  });

  it("export rekap hanya admin", () => {
    expect(canExportRegistrations(admin)).toBe(true);
    expect(canExportRegistrations(coachA)).toBe(false);
    expect(canExportRegistrations(athlete1User)).toBe(false);
  });
});
