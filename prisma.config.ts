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
    url: env("DATABASE_URL"),
  },
});
