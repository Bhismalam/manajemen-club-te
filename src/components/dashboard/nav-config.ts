import type { LucideIcon } from "lucide-react";
import {
  Award,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  History,
  LayoutDashboard,
  Medal,
  ShieldUser,
  Timer,
  Trophy,
  UserCog,
  UserRound,
  Users,
  UsersRound,
  Waves,
} from "lucide-react";

import type { UserRole } from "@/generated/prisma/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Tampil di bottom navigation mobile (khusus atlet, maksimal 5 item).
  mobile?: boolean;
};

export type RoleNav = {
  label: string;
  home: string;
  items: NavItem[];
};

// Navigasi per role (doc/DESIGN.md §6). Pengaturan akun ada di menu pengguna.
export const ROLE_NAV: Record<UserRole, RoleNav> = {
  ADMIN: {
    label: "Admin",
    home: "/admin",
    items: [
      { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
      { href: "/admin/athletes", label: "Atlet", icon: Users },
      { href: "/admin/coaches", label: "Pelatih", icon: UserCog },
      { href: "/admin/groups", label: "Kelompok Latihan", icon: UsersRound },
      { href: "/admin/training", label: "Latihan", icon: Waves },
      { href: "/admin/attendance", label: "Absensi", icon: CalendarCheck },
      { href: "/admin/time-trials", label: "Time Trial", icon: Timer },
      { href: "/admin/competitions", label: "Event", icon: Trophy },
      { href: "/admin/results", label: "Hasil Lomba", icon: Medal },
      { href: "/admin/users", label: "Pengguna", icon: ShieldUser },
    ],
  },
  COACH: {
    label: "Pelatih",
    home: "/coach",
    items: [
      { href: "/coach", label: "Ringkasan", icon: LayoutDashboard },
      { href: "/coach/athletes", label: "Atlet Binaan", icon: Users },
      { href: "/coach/training", label: "Latihan", icon: Waves },
      { href: "/coach/attendance", label: "Absensi", icon: CalendarCheck },
      { href: "/coach/time-trials", label: "Time Trial", icon: Timer },
      { href: "/coach/competitions", label: "Event", icon: Trophy },
      { href: "/coach/evaluations", label: "Evaluasi", icon: ClipboardList },
    ],
  },
  ATHLETE: {
    label: "Atlet",
    home: "/athlete",
    items: [
      { href: "/athlete", label: "Ringkasan", icon: LayoutDashboard, mobile: true },
      { href: "/athlete/schedule", label: "Jadwal", icon: CalendarDays, mobile: true },
      { href: "/athlete/events", label: "Event", icon: Trophy, mobile: true },
      { href: "/athlete/personal-bests", label: "Personal Best", icon: Award, mobile: true },
      { href: "/athlete/time-trials", label: "Time Trial", icon: Timer },
      { href: "/athlete/results", label: "Riwayat Lomba", icon: History },
      { href: "/athlete/evaluations", label: "Evaluasi", icon: ClipboardList },
      { href: "/athlete/profile", label: "Profil", icon: UserRound, mobile: true },
    ],
  },
};

// Item navigasi yang paling cocok dengan path (prefix terpanjang).
export function activeNavItem(role: UserRole, pathname: string): NavItem | undefined {
  return ROLE_NAV[role].items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
