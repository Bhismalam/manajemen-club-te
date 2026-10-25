import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { toClubDateInput } from "@/lib/format";
import { registrationWindowState } from "@/lib/registrations";
import { dateOnly } from "@/lib/validations/common";

// Data untuk website publik (tanpa login). Hanya data agregat & profil publik:
// tidak ada nama atlet, kontak pribadi, atau event DRAFT/CANCELLED.
// Di-cache beberapa menit (`use cache`), jadi perubahan muncul paling lambat ±1 menit kemudian.

export const PUBLIC_CACHE_TAG = "public-site";
const PUBLISHED = ["UPCOMING", "ONGOING", "COMPLETED"] as const;

export async function getClubStats() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_CACHE_TAG);
  const [athletes, coaches, groups, medals] = await Promise.all([
    prisma.athleteProfile.count({ where: { isActive: true, deletedAt: null } }),
    prisma.coachProfile.count({ where: { isActive: true, deletedAt: null } }),
    prisma.trainingGroup.count(),
    prisma.raceResult.count({
      where: {
        medal: { not: "NONE" },
        competitionEntry: { registration: { status: "REGISTERED" } },
      },
    }),
  ]);
  return { athletes, coaches, groups, medals };
}

export async function listPublicCoaches() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_CACHE_TAG);
  return prisma.coachProfile.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      specialization: true,
      trainingGroups: { orderBy: { name: "asc" }, select: { name: true } },
    },
  });
}

export async function listPublicGroups() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_CACHE_TAG);
  return prisma.trainingGroup.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      coach: { select: { fullName: true } },
    },
  });
}

const eventSelect = {
  id: true,
  name: true,
  location: true,
  level: true,
  status: true,
  startDate: true,
  endDate: true,
  registrationOpensAt: true,
  registrationClosesAt: true,
  _count: { select: { disciplines: true } },
} as const;

// Event terbit: yang akan datang / berlangsung, dan yang sudah lewat (terbaru dulu).
export async function listPublicEvents() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_CACHE_TAG);
  const now = new Date();
  const today = dateOnly(toClubDateInput(now));
  const [upcoming, past] = await Promise.all([
    prisma.competition.findMany({
      where: { status: { in: ["UPCOMING", "ONGOING"] }, endDate: { gte: today } },
      orderBy: { startDate: "asc" },
      select: eventSelect,
    }),
    prisma.competition.findMany({
      where: {
        status: { in: [...PUBLISHED] },
        OR: [{ status: "COMPLETED" }, { endDate: { lt: today } }],
      },
      orderBy: { startDate: "desc" },
      take: 12,
      select: eventSelect,
    }),
  ]);
  // Status pendaftaran dihitung di sini (ikut di-cache) agar komponen tidak membaca waktu sekarang.
  const withWindow = <T extends (typeof upcoming)[number]>(event: T) => {
    const window = registrationWindowState(event, now);
    return {
      ...event,
      registrationOpen: event.status === "UPCOMING" && window.state === "open",
      registrationClosesLabel: window.state === "open" ? window.label : null,
    };
  };
  return { upcoming: upcoming.map(withWindow), past: past.map(withWindow) };
}

export type PublicEvent = Awaited<ReturnType<typeof listPublicEvents>>["upcoming"][number];

// Rekap medali per event (agregat, tanpa nama atlet; atlet umumnya di bawah umur).
export async function getPublicAchievements() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PUBLIC_CACHE_TAG);
  const results = await prisma.raceResult.findMany({
    where: {
      medal: { not: "NONE" },
      competitionEntry: {
        registration: { status: "REGISTERED", competition: { status: { in: [...PUBLISHED] } } },
      },
    },
    select: {
      medal: true,
      competitionEntry: {
        select: {
          registration: {
            select: {
              competition: {
                select: { id: true, name: true, level: true, startDate: true, location: true },
              },
            },
          },
        },
      },
    },
  });

  type Event = (typeof results)[number]["competitionEntry"]["registration"]["competition"];
  const byEvent = new Map<string, { event: Event; GOLD: number; SILVER: number; BRONZE: number }>();
  const totals = { GOLD: 0, SILVER: 0, BRONZE: 0 };
  for (const result of results) {
    if (result.medal === "NONE") continue;
    const event = result.competitionEntry.registration.competition;
    const row = byEvent.get(event.id) ?? { event, GOLD: 0, SILVER: 0, BRONZE: 0 };
    row[result.medal] += 1;
    totals[result.medal] += 1;
    byEvent.set(event.id, row);
  }

  return {
    totals,
    events: [...byEvent.values()].sort(
      (a, b) => b.event.startDate.getTime() - a.event.startDate.getTime(),
    ),
  };
}
