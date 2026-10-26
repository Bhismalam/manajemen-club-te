import { createHmac } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { config } from "dotenv";

import { testDatabaseUrl } from "../src/test/test-database";

config({ path: [".env.local", ".env"], quiet: true });

export const TEST_DATABASE_URL = testDatabaseUrl();
export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "";
export const AUTH_DIR = path.join(__dirname, ".auth");
export const storageFor = (role: "admin" | "coach" | "athlete" | "athlete2") =>
  path.join(AUTH_DIR, `${role}.json`);

// Akun dari prisma/seed.ts.
export const USERS = {
  admin: "admin@club.local",
  coach: "coach.rina@club.local",
  athlete: "atlet1@club.local", // Bima, kelompok Rina, sudah terdaftar di event demo
  athlete2: "atlet2@club.local", // Citra, kelompok Rina, belum terdaftar
  otherAthlete: "atlet3@club.local", // Fajar, kelompok Dimas
} as const;

// SQL ke database TEST (bukan development).
export function sql(query: string): string {
  return execSync(
    `psql ${JSON.stringify(TEST_DATABASE_URL.replace(/\?.*$/, ""))} -qAtc ${JSON.stringify(query)}`,
  )
    .toString()
    .trim()
    .split("\n")[0]!;
}

export function resetAndSeedDatabase() {
  const env = {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    NODE_ENV: "development",
  } as NodeJS.ProcessEnv;
  execSync("pnpm exec prisma migrate deploy", { env, stdio: "pipe" });
  const tables = execSync(
    `psql ${JSON.stringify(TEST_DATABASE_URL.replace(/\?.*$/, ""))} -qAtc "select string_agg(format('%I.%I', schemaname, tablename), ', ') from pg_tables where schemaname='public' and tablename <> '_prisma_migrations'"`,
  )
    .toString()
    .trim();
  if (tables) sql(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  execSync("pnpm exec tsx prisma/seed.ts", { env, stdio: "pipe" });
}

// TOTP (RFC 6238, SHA-1, 6 digit, 30 detik) untuk akun admin uji.
export function totp(uri: string, offsetSeconds = 0): string {
  const secret = new URL(uri).searchParams.get("secret") ?? "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  }
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor((Date.now() / 1000 + offsetSeconds) / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 15;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

export type AdminSecrets = { totpURI: string; backupCodes: string[] };

export function readAdminSecrets(): AdminSecrets {
  return JSON.parse(fs.readFileSync(path.join(AUTH_DIR, "admin-secrets.json"), "utf8"));
}

// exceljs mengharapkan ArrayBuffer (tipe Buffer miliknya sendiri).
export function toArrayBuffer(buffer: Uint8Array): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

// Setiap konteks API tes memakai IP klien sendiri (seperti pengguna nyata di Vercel), sehingga
// rate limit login per IP (5/menit) tidak membuat tes saling menghabiskan kuota.
let ipCounter = 0;
export function clientHeaders(baseURL: string) {
  ipCounter += 1;
  return { Origin: baseURL, "x-forwarded-for": `198.51.100.${(ipCounter % 250) + 1}` };
}
