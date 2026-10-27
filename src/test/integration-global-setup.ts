import { execSync } from "node:child_process";

import { config } from "dotenv";
import { Client } from "pg";

import { databaseName, testDatabaseUrl } from "./test-database";

// Sekali sebelum semua integration test: buat database test bila belum ada, lalu terapkan migrasi.
export default async function setup() {
  config({ path: [".env.local", ".env"], quiet: true });
  const url = testDatabaseUrl();
  const name = databaseName(url);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  admin.search = "";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("select 1 from pg_database where datname = $1", [name]);
  if (exists.rowCount === 0) await client.query(`create database "${name.replace(/"/g, "")}"`);
  await client.end();

  execSync("pnpm exec prisma migrate deploy", {
    // DIRECT_URL juga diarahkan ke database test (prisma.config.ts memprioritaskannya).
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: "pipe",
  });
}
