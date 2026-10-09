// Seed data untuk development. Jalankan: `pnpm db:seed` (atau otomatis via `prisma migrate reset`).
// Password semua akun demo diambil dari env SEED_PASSWORD (lihat .env.example).

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";

import type { Prisma, SportType, UserRole } from "../src/generated/prisma/client";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: [".env.local", ".env"], quiet: true });

if (process.env.NODE_ENV === "production") {
  throw new Error("Seed development tidak boleh dijalankan di production.");
}

const databaseUrl = process.env.DATABASE_URL;
const seedPassword = process.env.SEED_PASSWORD;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
if (!seedPassword || seedPassword.length < 8) {
  throw new Error("SEED_PASSWORD wajib diisi di .env.local (minimal 8 karakter).");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS);
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

// ----------------------------------------------------------------------------
// Reference data
// ----------------------------------------------------------------------------

type DisciplineSeed = {
  code: string;
  name: string;
  sportType: SportType;
  distanceMeter: number;
  style: string;
};

const disciplines: DisciplineSeed[] = [
  ...[50, 100, 200, 400].map((d) => ({
    code: `SW-${d}FR-LC`,
    name: `${d}m Freestyle`,
    sportType: "SWIMMING" as const,
    distanceMeter: d,
    style: "FREESTYLE",
  })),
  ...(["BACKSTROKE", "BREASTSTROKE", "BUTTERFLY"] as const).flatMap((style) =>
    [50, 100].map((d) => ({
      code: `SW-${d}${style.slice(0, 2)}-LC`,
      name: `${d}m ${style.charAt(0)}${style.slice(1).toLowerCase()}`,
      sportType: "SWIMMING" as const,
      distanceMeter: d,
      style,
    })),
  ),
  {
    code: "SW-200IM-LC",
    name: "200m Individual Medley",
    sportType: "SWIMMING",
    distanceMeter: 200,
    style: "INDIVIDUAL_MEDLEY",
  },
  ...[50, 100, 200, 400].map((d) => ({
    code: `FS-${d}SF-LC`,
    name: `${d}m Surface`,
    sportType: "FINSWIMMING" as const,
    distanceMeter: d,
    style: "SURFACE",
  })),
  ...[50, 100, 200].map((d) => ({
    code: `FS-${d}BF-LC`,
    name: `${d}m Bi-Fins`,
    sportType: "FINSWIMMING" as const,
    distanceMeter: d,
    style: "BIFINS",
  })),
  {
    code: "FS-50AP-LC",
    name: "50m Apnea",
    sportType: "FINSWIMMING",
    distanceMeter: 50,
    style: "APNEA",
  },
];

async function seedDisciplines() {
  for (const d of disciplines) {
    await prisma.discipline.upsert({
      where: { code: d.code },
      update: {
        name: d.name,
        sportType: d.sportType,
        distanceMeter: d.distanceMeter,
        style: d.style,
      },
      create: { ...d, poolLength: 50 },
    });
  }
}

// ----------------------------------------------------------------------------
// Users
// ----------------------------------------------------------------------------

async function upsertUser(email: string, name: string, role: UserRole, passwordHash: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const id = randomUUID();
  return prisma.user.create({
    data: {
      id,
      email,
      name,
      role,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          providerId: "credential",
          accountId: id,
          password: passwordHash,
        },
      },
    },
  });
}

async function seedPeople(passwordHash: string) {
  await upsertUser("admin@club.local", "Admin Klub", "ADMIN", passwordHash);

  const coachSeeds = [
    { email: "coach.rina@club.local", fullName: "Rina Pratiwi", specialization: "Swimming" },
    { email: "coach.dimas@club.local", fullName: "Dimas Saputra", specialization: "Finswimming" },
  ];

  const coaches = [];
  for (const c of coachSeeds) {
    const user = await upsertUser(c.email, c.fullName, "COACH", passwordHash);
    coaches.push(
      await prisma.coachProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, fullName: c.fullName, specialization: c.specialization },
      }),
    );
  }

  const [rina, dimas] = coaches;
  if (!rina || !dimas) throw new Error("Coach seed gagal");

  const groups = {
    junior: await prisma.trainingGroup.upsert({
      where: { name: "Junior Swimming" },
      update: {},
      create: { name: "Junior Swimming", description: "Atlet renang usia 10–14", coachId: rina.id },
    }),
    fins: await prisma.trainingGroup.upsert({
      where: { name: "Finswimming" },
      update: {},
      create: { name: "Finswimming", description: "Kelompok finswimming", coachId: dimas.id },
    }),
  };

  const athleteSeeds = [
    {
      no: "ATL-0001",
      name: "Bima Aditya",
      gender: "MALE",
      birth: "2011-04-12",
      group: groups.junior,
    },
    {
      no: "ATL-0002",
      name: "Citra Lestari",
      gender: "FEMALE",
      birth: "2012-08-03",
      group: groups.junior,
    },
    {
      no: "ATL-0003",
      name: "Fajar Nugroho",
      gender: "MALE",
      birth: "2008-01-21",
      group: groups.fins,
    },
    {
      no: "ATL-0004",
      name: "Ayu Maharani",
      gender: "FEMALE",
      birth: "2009-11-30",
      group: groups.fins,
    },
  ] as const;

  const athletes = [];
  for (const [index, a] of athleteSeeds.entries()) {
    const user = await upsertUser(`atlet${index + 1}@club.local`, a.name, "ATHLETE", passwordHash);
    athletes.push(
      await prisma.athleteProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          athleteNumber: a.no,
          fullName: a.name,
          gender: a.gender,
          birthDate: dateOnly(a.birth),
          joinDate: dateOnly("2024-01-15"),
          trainingGroupId: a.group.id,
        },
      }),
    );
  }

  return { coaches: { rina, dimas }, groups, athletes };
}

// ----------------------------------------------------------------------------
// Demo data (dibuat sekali)
// ----------------------------------------------------------------------------

const DEMO_COMPETITION_NAME = "Kejuaraan Renang & Finswimming Antar Klub (Demo)";

async function seedDemoData(people: Awaited<ReturnType<typeof seedPeople>>) {
  const existing = await prisma.competition.findFirst({ where: { name: DEMO_COMPETITION_NAME } });
  if (existing) return;

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@club.local" } });
  const rinaUser = await prisma.user.findUniqueOrThrow({
    where: { id: people.coaches.rina.userId },
  });
  const dimasUser = await prisma.user.findUniqueOrThrow({
    where: { id: people.coaches.dimas.userId },
  });

  const byCode = async (code: string) => prisma.discipline.findUniqueOrThrow({ where: { code } });
  const fr50 = await byCode("SW-50FR-LC");
  const fr100 = await byCode("SW-100FR-LC");
  const sf50 = await byCode("FS-50SF-LC");
  const sf100 = await byCode("FS-100SF-LC");

  // Sesi latihan + absensi
  const sessionStart = daysFromNow(-2);
  sessionStart.setUTCHours(9, 0, 0, 0);
  const juniorSession = await prisma.trainingSession.create({
    data: {
      trainingGroupId: people.groups.junior.id,
      title: "Latihan endurance",
      startsAt: sessionStart,
      endsAt: new Date(sessionStart.getTime() + 2 * 60 * 60 * 1000),
      location: "Kolam Renang Utama",
      createdById: rinaUser.id,
    },
  });

  const juniorAthletes = people.athletes.filter(
    (a) => a.trainingGroupId === people.groups.junior.id,
  );
  const finsAthletes = people.athletes.filter((a) => a.trainingGroupId === people.groups.fins.id);

  await prisma.attendance.createMany({
    data: juniorAthletes.map((a, i) => ({
      trainingSessionId: juniorSession.id,
      athleteId: a.id,
      status: i === 0 ? "PRESENT" : "SICK",
      recordedById: rinaUser.id,
    })),
  });

  // Time trial + PB
  const trials: {
    athleteId: string;
    disciplineId: string;
    durationMs: number;
    recordedById: string;
  }[] = [
    ...juniorAthletes.map((a, i) => ({
      athleteId: a.id,
      disciplineId: fr50.id,
      durationMs: 31_450 + i * 1_200,
      recordedById: rinaUser.id,
    })),
    ...finsAthletes.map((a, i) => ({
      athleteId: a.id,
      disciplineId: sf50.id,
      durationMs: 21_870 + i * 900,
      recordedById: dimasUser.id,
    })),
  ];

  for (const t of trials) {
    const trial = await prisma.timeTrial.create({
      data: { ...t, trainingSessionId: null, trialDate: daysFromNow(-1) },
    });
    await prisma.personalBest.create({
      data: {
        athleteId: t.athleteId,
        disciplineId: t.disciplineId,
        durationMs: t.durationMs,
        achievedAt: trial.trialDate,
        sourceType: "TIME_TRIAL",
        sourceId: trial.id,
      },
    });
  }

  // Event yang sedang membuka pendaftaran
  const competition = await prisma.competition.create({
    data: {
      name: DEMO_COMPETITION_NAME,
      description: "Event demo untuk menguji alur pendaftaran atlet dan rekap admin.",
      location: "Stadion Akuatik",
      startDate: dateOnly(daysFromNow(21).toISOString().slice(0, 10)),
      endDate: dateOnly(daysFromNow(22).toISOString().slice(0, 10)),
      level: "REGIONAL",
      status: "UPCOMING",
      registrationOpensAt: daysFromNow(-1),
      registrationClosesAt: daysFromNow(14),
      maxEntriesPerAthlete: 3,
      createdById: admin.id,
      disciplines: {
        create: [fr50, fr100, sf50, sf100].map((d) => ({ disciplineId: d.id })),
      },
    },
  });

  // Satu atlet mendaftar sendiri, satu didaftarkan pelatih.
  const registrations: { athleteId: string; registeredBy: string; disciplineIds: string[] }[] = [];
  const [firstJunior] = juniorAthletes;
  const [firstFins] = finsAthletes;
  if (firstJunior) {
    registrations.push({
      athleteId: firstJunior.id,
      registeredBy: firstJunior.userId,
      disciplineIds: [fr50.id, fr100.id],
    });
  }
  if (firstFins) {
    registrations.push({
      athleteId: firstFins.id,
      registeredBy: dimasUser.id,
      disciplineIds: [sf50.id, sf100.id],
    });
  }

  for (const r of registrations) {
    const pbs = await prisma.personalBest.findMany({
      where: { athleteId: r.athleteId, disciplineId: { in: r.disciplineIds } },
    });
    const seedTimeFor = (disciplineId: string) =>
      pbs.find((pb) => pb.disciplineId === disciplineId)?.durationMs ?? null;

    const registration = await prisma.competitionRegistration.create({
      data: {
        competitionId: competition.id,
        athleteId: r.athleteId,
        registeredByUserId: r.registeredBy,
      },
    });

    const entries: Prisma.CompetitionEntryCreateManyInput[] = r.disciplineIds.map(
      (disciplineId) => ({
        registrationId: registration.id,
        competitionId: competition.id,
        athleteId: r.athleteId,
        disciplineId,
        seedTimeMs: seedTimeFor(disciplineId),
      }),
    );
    await prisma.competitionEntry.createMany({ data: entries });

    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "REGISTRATION_CREATED",
        title: "Pendaftaran event baru",
        message: `Pendaftaran baru untuk ${competition.name}.`,
        linkUrl: `/admin/competitions/${competition.id}/registrations`,
      },
    });
  }
}

// ----------------------------------------------------------------------------

async function main() {
  const passwordHash = await hashPassword(seedPassword as string);

  await seedDisciplines();
  const people = await seedPeople(passwordHash);
  await seedDemoData(people);

  const counts = {
    users: await prisma.user.count(),
    disciplines: await prisma.discipline.count(),
    athletes: await prisma.athleteProfile.count(),
    coaches: await prisma.coachProfile.count(),
    competitions: await prisma.competition.count(),
    entries: await prisma.competitionEntry.count(),
  };
  console.log("Seed selesai:", counts);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
