// Kebijakan izin berupa fungsi murni (tanpa database) agar mudah diuji.
// Pemanggil wajib mengambil fakta resource dari database, bukan dari input client.

import type { Actor, AthleteRef, CompetitionRef, Decision } from "./types";

const ALLOW: Decision = { allowed: true };
const deny = (reason: Exclude<Decision, { allowed: true }>["reason"]): Decision => ({
  allowed: false,
  reason,
});

export function isAdmin(actor: Actor): boolean {
  return actor.role === "ADMIN";
}

// Atlet binaan = atlet di training group yang dilatih coach ini.
export function coachesAthlete(actor: Actor, athlete: Pick<AthleteRef, "coachId">): boolean {
  return actor.role === "COACH" && actor.coachId !== null && athlete.coachId === actor.coachId;
}

export function isSelf(actor: Actor, athleteId: string): boolean {
  return actor.role === "ATHLETE" && actor.athleteId !== null && actor.athleteId === athleteId;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function canManageUsers(actor: Actor): boolean {
  return isAdmin(actor);
}

// ---------------------------------------------------------------------------
// Athlete data
// ---------------------------------------------------------------------------

// Profil, absensi, time trial, PB, hasil lomba, evaluasi milik atlet.
export function canViewAthlete(actor: Actor, athlete: Pick<AthleteRef, "id" | "coachId">): boolean {
  return isAdmin(actor) || coachesAthlete(actor, athlete) || isSelf(actor, athlete.id);
}

// Mencatat / mengubah data performa: absensi, time trial, hasil lomba, evaluasi.
// Atlet tidak pernah boleh mengubah data performanya sendiri.
export function canManageAthletePerformance(
  actor: Actor,
  athlete: Pick<AthleteRef, "coachId">,
): boolean {
  return isAdmin(actor) || coachesAthlete(actor, athlete);
}

export function canEditTimeTrial(
  actor: Actor,
  timeTrial: { athlete: Pick<AthleteRef, "coachId"> },
) {
  return canManageAthletePerformance(actor, timeTrial.athlete);
}

// Evaluasi hanya boleh diubah oleh admin atau pelatih penulisnya yang masih membina atlet tersebut.
export function canEditEvaluation(
  actor: Actor,
  evaluation: { coachId: string; athlete: Pick<AthleteRef, "coachId"> },
): boolean {
  if (isAdmin(actor)) return true;
  return coachesAthlete(actor, evaluation.athlete) && evaluation.coachId === actor.coachId;
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

export function canManageTrainingGroup(actor: Actor, group: { coachId: string | null }): boolean {
  if (isAdmin(actor)) return true;
  return actor.role === "COACH" && actor.coachId !== null && group.coachId === actor.coachId;
}

// ---------------------------------------------------------------------------
// Competition
// ---------------------------------------------------------------------------

export function canCreateCompetition(actor: Actor): boolean {
  return isAdmin(actor) || actor.role === "COACH";
}

// Admin: semua event. Coach: hanya event yang dibuatnya.
export function canManageCompetition(
  actor: Actor,
  competition: Pick<CompetitionRef, "createdById">,
) {
  return isAdmin(actor) || (actor.role === "COACH" && competition.createdById === actor.userId);
}

// Event DRAFT hanya terlihat oleh yang boleh mengelolanya.
export function canViewCompetition(
  actor: Actor,
  competition: Pick<CompetitionRef, "status" | "createdById">,
): boolean {
  if (competition.status === "DRAFT") return canManageCompetition(actor, competition);
  return true;
}

export function isRegistrationOpen(
  competition: Pick<CompetitionRef, "status" | "registrationOpensAt" | "registrationClosesAt">,
  now: Date,
): boolean {
  const { status, registrationOpensAt, registrationClosesAt } = competition;
  if (status !== "UPCOMING" || !registrationOpensAt || !registrationClosesAt) return false;
  return registrationOpensAt <= now && now <= registrationClosesAt;
}

// Mendaftarkan / mengubah / membatalkan pendaftaran atlet ke event.
// - Atlet: hanya dirinya sendiri, selama pendaftaran dibuka.
// - Coach: hanya atlet binaannya, selama pendaftaran dibuka.
// - Admin: atlet mana pun, termasuk setelah deadline, selama event UPCOMING/ONGOING.
export function canRegisterAthlete(
  actor: Actor,
  athlete: AthleteRef,
  competition: CompetitionRef,
  now: Date,
): Decision {
  const isOwnerOrCoach = isSelf(actor, athlete.id) || coachesAthlete(actor, athlete);
  if (!isAdmin(actor) && !isOwnerOrCoach) return deny("FORBIDDEN");
  if (!athlete.isActive) return deny("ATHLETE_INACTIVE");

  if (isAdmin(actor)) {
    return competition.status === "UPCOMING" || competition.status === "ONGOING"
      ? ALLOW
      : deny("COMPETITION_NOT_OPEN");
  }

  if (competition.status !== "UPCOMING") return deny("COMPETITION_NOT_OPEN");
  return isRegistrationOpen(competition, now) ? ALLOW : deny("REGISTRATION_CLOSED");
}

// Melihat satu pendaftaran. Untuk daftar, pakai athleteScope() di scopes.ts.
export function canViewRegistration(
  actor: Actor,
  registration: { athlete: Pick<AthleteRef, "id" | "coachId"> },
) {
  return canViewAthlete(actor, registration.athlete);
}

export function canExportRegistrations(actor: Actor): boolean {
  return isAdmin(actor);
}
