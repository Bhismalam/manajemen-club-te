// Membuat akun ADMIN pertama (mis. di database produksi yang masih kosong).
//
//   pnpm admin:create --email admin@klub.id --name "Nama Admin"
//
// Untuk produksi, simpan URL database produksi di .env.production.local lalu:
//   pnpm admin:create --env .env.production.local --email ... --name "..."
//
// Password sementara ditampilkan SEKALI di terminal. Saat login pertama admin wajib
// mengganti password, lalu wajib mengaktifkan MFA sebelum bisa membuka dashboard admin.

import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { pgConfig } from "../src/lib/db/pg-config";
import { generateTemporaryPassword } from "../src/lib/auth/temporary-password";
import { writeAuditLog } from "../src/services/audit-log-service";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    env: { type: "string" },
  },
});

config({ path: values.env ? [values.env] : [".env.local", ".env"], quiet: true, override: true });

async function main() {
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || name.length < 2) {
    console.error('Pemakaian: pnpm admin:create --email <email> --name "<nama>" [--env <file>]');
    process.exitCode = 1;
    return;
  }

  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg(pgConfig(databaseUrl)) });

  try {
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      console.error(`Email ${email} sudah terdaftar.`);
      process.exitCode = 1;
      return;
    }

    const id = randomUUID();
    const temporaryPassword = generateTemporaryPassword();
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id,
          email,
          name,
          role: "ADMIN",
          emailVerified: true,
          mustChangePassword: true,
          accounts: {
            create: {
              id: randomUUID(),
              providerId: "credential",
              accountId: id,
              password: await hashPassword(temporaryPassword),
            },
          },
        },
      });
      await writeAuditLog(tx, {
        actorUserId: null,
        action: "user.created",
        entityType: "User",
        entityId: id,
        metadata: { role: "ADMIN", email, via: "cli" },
      });
    });

    const host = new URL(databaseUrl).host;
    console.log(`\nAdmin dibuat di database ${host}`);
    console.log(`  Email            : ${email}`);
    console.log(`  Password sementara: ${temporaryPassword}`);
    console.log(
      "\nPassword ini tidak ditampilkan lagi. Login pertama: ganti password, lalu aktifkan MFA.\n",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
