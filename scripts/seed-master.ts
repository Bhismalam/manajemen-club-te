// Data master untuk database produksi (aman dijalankan berulang, tanpa data demo):
// saat ini daftar nomor lomba. Dijalankan otomatis oleh `vercel-build` di production.
//
//   pnpm db:seed:master

import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { seedDisciplines } from "../prisma/data/disciplines";
import { PrismaClient } from "../src/generated/prisma/client";
import { pgConfig } from "../src/lib/db/pg-config";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg(pgConfig(databaseUrl)) });
  try {
    const count = await seedDisciplines(prisma);
    console.log(`Data master: ${count} nomor lomba diselaraskan.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
