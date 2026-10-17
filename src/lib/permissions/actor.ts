import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserRole } from "@/generated/prisma/enums";
import { MFA_SETUP_PATH } from "@/lib/auth/routes";
import type { CurrentUser } from "@/lib/auth/session";
import { requireRole, requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

import type { Actor } from "./types";

// Lengkapi user dari session dengan ID profil atlet/pelatih. Profil nonaktif / terhapus
// dianggap tidak ada, sehingga semua akses berbasis kepemilikan otomatis tertutup.
const loadActor = cache(async (user: CurrentUser): Promise<Actor> => {
  const [athlete, coach] = await Promise.all([
    user.role === "ATHLETE"
      ? prisma.athleteProfile.findFirst({
          where: { userId: user.id, isActive: true, deletedAt: null },
          select: { id: true },
        })
      : null,
    user.role === "COACH"
      ? prisma.coachProfile.findFirst({
          where: { userId: user.id, isActive: true, deletedAt: null },
          select: { id: true },
        })
      : null,
  ]);

  return {
    userId: user.id,
    role: user.role,
    athleteId: athlete?.id ?? null,
    coachId: coach?.id ?? null,
  };
});

// Titik masuk untuk Server Action / Route Handler / Server Component yang butuh izin.
// Admin tanpa MFA tetap diarahkan ke setup MFA (sama seperti requireAdmin).
export async function requireActor(...roles: UserRole[]): Promise<Actor> {
  const user = roles.length > 0 ? await requireRole(...roles) : await requireUser();
  if (user.role === "ADMIN" && !user.twoFactorEnabled) redirect(MFA_SETUP_PATH);
  return loadActor(user);
}
