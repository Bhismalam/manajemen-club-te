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
