import { randomUUID } from "node:crypto";

import type { CompetitionStatus, SportType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/permissions/types";

// Data uji untuk integration test. Semua dibuat langsung lewat Prisma (tanpa Better Auth),
// karena yang diuji adalah service & aturan izin, bukan alur login.

let sequence = 0;
const next = () => ++sequence;

// Kosongkan semua tabel aplikasi (kecuali riwayat migrasi) sebelum setiap test.
export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

async function createUser(role: "ADMIN" | "COACH" | "ATHLETE", name: string) {
  const n = next();
  return prisma.user.create({
    data: {
      id: randomUUID(),
      name,
      email: `${role.toLowerCase()}${n}@test.local`,
      role,
      emailVerified: true,
      twoFactorEnabled: role === "ADMIN",
    },
  });
}

export async function createAdmin(name = "Admin Uji"): Promise<Actor> {
  const user = await createUser("ADMIN", name);
  return { userId: user.id, role: "ADMIN", athleteId: null, coachId: null };
}

export async function createCoach(name = `Pelatih ${next()}`) {
  const user = await createUser("COACH", name);
  const coach = await prisma.coachProfile.create({
    data: { userId: user.id, fullName: name, specialization: "Swimming" },
  });
  const actor: Actor = { userId: user.id, role: "COACH", athleteId: null, coachId: coach.id };
  return { ...coach, actor };
}

export async function createGroup(coachId: string | null, name = `Kelompok ${next()}`) {
  return prisma.trainingGroup.create({ data: { name, coachId } });
}

export async function createAthlete(
  options: {
    groupId?: string | null;
    name?: string;
    isActive?: boolean;
    gender?: "MALE" | "FEMALE";
  } = {},
) {
  const name = options.name ?? `Atlet ${next()}`;
  const user = await createUser("ATHLETE", name);
  const athlete = await prisma.athleteProfile.create({
    data: {
      userId: user.id,
      fullName: name,
      athleteNumber: `T-${String(next()).padStart(4, "0")}`,
      birthDate: new Date("2011-04-12T00:00:00Z"),
      joinDate: new Date("2024-01-15T00:00:00Z"),
      gender: options.gender ?? "MALE",
      trainingGroupId: options.groupId ?? null,
      isActive: options.isActive ?? true,
    },
  });
  const actor: Actor = { userId: user.id, role: "ATHLETE", athleteId: athlete.id, coachId: null };
  return { ...athlete, actor };
}

export async function createDiscipline(
  options: { name?: string; sportType?: SportType; distanceMeter?: number } = {},
) {
  const n = next();
  return prisma.discipline.create({
    data: {
      code: `D${n}`,
      name: options.name ?? `${options.distanceMeter ?? 50}m Gaya ${n}`,
      sportType: options.sportType ?? "SWIMMING",
      distanceMeter: options.distanceMeter ?? 50,
      style: `style-${n}`,
      poolLength: 50,
    },
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Default: event UPCOMING dengan pendaftaran sedang dibuka (relatif terhadap sekarang).
export async function createCompetition(options: {
  createdById: string;
  disciplineIds: string[];
  status?: CompetitionStatus;
  name?: string;
  opensInDays?: number;
  closesInDays?: number;
  startsInDays?: number;
  maxEntriesPerAthlete?: number | null;
}) {
  const now = Date.now();
  const startsIn = options.startsInDays ?? 20;
  // Deadline wajib ≤ tanggal mulai (CHECK constraint), pembukaan sebelum deadline.
  const closesIn = options.closesInDays ?? Math.min(10, startsIn - 1);
  const opensIn = options.opensInDays ?? Math.min(-1, closesIn - 1);
  const start = new Date(now + startsIn * DAY_MS);
  const startDate = new Date(`${start.toISOString().slice(0, 10)}T00:00:00Z`);
  const status = options.status ?? "UPCOMING";
  return prisma.competition.create({
    data: {
      name: options.name ?? `Kejuaraan ${next()}`,
      location: "Kolam Uji",
      level: "REGIONAL",
      status,
      startDate,
      endDate: startDate,
      registrationOpensAt: new Date(now + opensIn * DAY_MS),
      registrationClosesAt: new Date(now + closesIn * DAY_MS),
      maxEntriesPerAthlete: options.maxEntriesPerAthlete ?? null,
      createdById: options.createdById,
      disciplines: { create: options.disciplineIds.map((disciplineId) => ({ disciplineId })) },
    },
  });
}
