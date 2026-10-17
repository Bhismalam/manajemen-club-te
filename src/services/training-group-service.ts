import "server-only";

import { prisma } from "@/lib/db/prisma";

export type GroupOption = { id: string; name: string };

// Pilihan kelompok latihan untuk form (urut nama).
export async function listTrainingGroupOptions(): Promise<GroupOption[]> {
  return prisma.trainingGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
