import type { CompetitionStatus, UserRole } from "@/generated/prisma/enums";

// Siapa yang melakukan aksi. Dibuat di server dari session (lihat actor.ts), jangan dari input client.
export type Actor = {
  userId: string;
  role: UserRole;
  // ID AthleteProfile milik user (role ATHLETE), null jika tidak ada / nonaktif.
  athleteId: string | null;
  // ID CoachProfile milik user (role COACH), null jika tidak ada / nonaktif.
  coachId: string | null;
};

// Fakta minimal tentang atlet yang dibutuhkan untuk keputusan izin.
export type AthleteRef = {
  id: string;
  // Pelatih dari training group atlet (null jika belum punya group / group tanpa pelatih).
  coachId: string | null;
  isActive: boolean;
};

export type CompetitionRef = {
  status: CompetitionStatus;
  createdById: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
};

export type DenyReason =
  "FORBIDDEN" | "ATHLETE_INACTIVE" | "COMPETITION_NOT_OPEN" | "REGISTRATION_CLOSED";

export type Decision = { allowed: true } | { allowed: false; reason: DenyReason };
