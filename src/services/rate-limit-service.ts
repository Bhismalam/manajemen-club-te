import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";

// Rate limit aksi aplikasi (di luar endpoint Better Auth), per user per aksi, jendela tetap.
// Memakai tabel `rate_limit` Better Auth dengan prefix kunci "app:" (kunci Better Auth berbentuk
// "ip|path", jadi tidak bentrok). Satu UPSERT atomik: aman untuk request bersamaan.
// Kolom `lastRequest` di sini berarti awal jendela (ms).

export const RATE_LIMITS = {
  registration: { max: 20, windowSeconds: 60 },
  export: { max: 10, windowSeconds: 60 },
  upload: { max: 10, windowSeconds: 60 },
  results: { max: 60, windowSeconds: 60 },
  passwordReset: { max: 10, windowSeconds: 60 },
  evaluation: { max: 20, windowSeconds: 60 },
  download: { max: 30, windowSeconds: 60 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

export async function enforceRateLimit(name: RateLimitName, subject: string, now = Date.now()) {
  const { max, windowSeconds } = RATE_LIMITS[name];
  const key = `app:${name}:${subject}`;
  const windowStart = BigInt(now - windowSeconds * 1000);
  const nowMs = BigInt(now);

  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit" ("id", "key", "count", "lastRequest")
    VALUES (${randomUUID()}, ${key}, 1, ${nowMs})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit"."lastRequest" < ${windowStart} THEN 1
                     ELSE "rate_limit"."count" + 1 END,
      "lastRequest" = CASE WHEN "rate_limit"."lastRequest" < ${windowStart} THEN ${nowMs}
                           ELSE "rate_limit"."lastRequest" END
    RETURNING "count"`;

  if ((row?.count ?? 0) > max) {
    throw new AppError(
      "RATE_LIMITED",
      "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
    );
  }
}
