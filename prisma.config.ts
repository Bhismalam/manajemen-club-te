import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Samakan sumber env dengan Next.js: .env.local lebih prioritas daripada .env.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrasi memakai koneksi langsung (DIRECT_URL) bila ada, karena pooler mode transaksi
    // (Supabase port 6543) tidak cocok untuk migrasi. Runtime aplikasi tetap DATABASE_URL.
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
});
