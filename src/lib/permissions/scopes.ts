import type { Prisma } from "@/generated/prisma/client";

import type { Actor } from "./types";

// Filter yang tidak pernah cocok dengan baris mana pun.
const NONE: Prisma.AthleteProfileWhereInput = { id: { in: [] } };

// Batasi query daftar atlet (dan data turunannya) sesuai siapa yang bertanya.
// Pakai di setiap query list, mis. `where: { athlete: athleteScope(actor) }`.
export function athleteScope(actor: Actor): Prisma.AthleteProfileWhereInput {
  switch (actor.role) {
    case "ADMIN":
      return { deletedAt: null };
    case "COACH":
      return actor.coachId ? { deletedAt: null, trainingGroup: { coachId: actor.coachId } } : NONE;
    case "ATHLETE":
      return actor.athleteId ? { id: actor.athleteId } : NONE;
  }
}

// Sesi latihan yang boleh dilihat: admin semua, coach kelompok miliknya, atlet kelompoknya sendiri.
export function trainingSessionScope(actor: Actor): Prisma.TrainingSessionWhereInput {
  switch (actor.role) {
    case "ADMIN":
      return {};
    case "COACH":
      return actor.coachId ? { trainingGroup: { coachId: actor.coachId } } : { id: { in: [] } };
    case "ATHLETE":
      return actor.athleteId
        ? { trainingGroup: { athletes: { some: { id: actor.athleteId } } } }
        : { id: { in: [] } };
  }
}

// Kelompok latihan yang boleh dikelola (buat/edit sesi): admin semua, coach miliknya.
export function manageableGroupScope(actor: Actor): Prisma.TrainingGroupWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "COACH" && actor.coachId) return { coachId: actor.coachId };
  return { id: { in: [] } };
}
