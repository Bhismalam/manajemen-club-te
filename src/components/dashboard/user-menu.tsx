import { getCurrentUser } from "@/lib/auth/session";

import { ROLE_NAV } from "./nav-config";
import { UserMenuDropdown } from "./user-menu-dropdown";

// Membaca session, jadi wajib dirender di dalam <Suspense>. Otorisasi halaman tetap
// dilakukan oleh guard di page; menu ini hanya menampilkan identitas.
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <UserMenuDropdown name={user.name} email={user.email} roleLabel={ROLE_NAV[user.role].label} />
  );
}

export function UserMenuSkeleton() {
  return <div className="size-8 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />;
}
