import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth/auth";
import { dashboardPathFor, LOGIN_PATH } from "@/lib/auth/routes";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  twoFactorEnabled: boolean;
};

// Satu kali baca session per request. Sengaja tidak memakai `use cache: private`:
// ban / perubahan role harus langsung berlaku, bukan setelah cache browser kedaluwarsa.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { user } = session;
  if (user.banned || user.status !== "ACTIVE" || user.deletedAt) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}

// User dengan role lain diarahkan ke dashboard miliknya sendiri.
export async function requireRole(...roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(dashboardPathFor(user.role));
  return user;
}
