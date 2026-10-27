// Data master nomor lomba (renang & finswimming, kolam 50m). Dipakai oleh seed development
// dan seed master produksi (scripts/seed-master.ts). Idempoten: upsert berdasarkan `code`.

import type { PrismaClient, SportType } from "../../src/generated/prisma/client";

type DisciplineSeed = {
  code: string;
  name: string;
  sportType: SportType;
  distanceMeter: number;
  style: string;
};

export const DISCIPLINES: DisciplineSeed[] = [
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

export async function seedDisciplines(prisma: PrismaClient) {
  for (const d of DISCIPLINES) {
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
  return DISCIPLINES.length;
}
