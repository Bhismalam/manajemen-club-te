import { config } from "dotenv";
import { afterAll, beforeEach } from "vitest";

import { testDatabaseUrl } from "./test-database";

// Sebelum modul aplikasi di-import: arahkan Prisma ke database test.
config({ path: [".env.local", ".env"], quiet: true });
process.env.DATABASE_URL = testDatabaseUrl();
// Storage tidak dipakai di integration test (tidak ada panggilan ke Supabase).
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { prisma } = await import("@/lib/db/prisma");
const { resetDatabase } = await import("./factories");

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
