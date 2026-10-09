// Pemulihan darurat: reset MFA satu akun langsung dari server (mis. admin terakhir kehilangan
// perangkat dan recovery code). Butuh akses ke DATABASE_URL; tidak ada endpoint publiknya.
//
//   pnpm mfa:reset --email admin@club.local --reason "HP hilang" --yes
//
// Efek: secret TOTP & recovery code dihapus, semua session dan perangkat tepercaya dicabut,
// dan dicatat di audit_log (actor = sistem). Admin akan diminta setup MFA saat login berikutnya.

import { parseArgs } from "node:util";

import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { resetUserMfa } from "../src/services/mfa-service";

config({ path: [".env.local", ".env"], quiet: true });

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    reason: { type: "string" },
    yes: { type: "boolean", default: false },
  },
});

async function main() {
  const email = values.email?.trim().toLowerCase();
  const reason = values.reason?.trim();
  if (!email || !reason) {
    console.error('Pemakaian: pnpm mfa:reset --email <email> --reason "<alasan>" --yes');
    process.exitCode = 1;
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, twoFactorEnabled: true },
    });
    if (!user) {
      console.error(`User dengan email ${email} tidak ditemukan.`);
      process.exitCode = 1;
      return;
    }

    console.log(
      `Target: ${user.name} <${email}> · role ${user.role} · MFA ${user.twoFactorEnabled ? "aktif" : "tidak aktif"}`,
    );
    if (!values.yes) {
      console.log("Tambahkan --yes untuk benar-benar mereset MFA akun ini.");
      return;
    }

    const result = await resetUserMfa(prisma, {
      targetUserId: user.id,
      actorUserId: null,
      reason: `CLI: ${reason}`,
    });
    console.log(
      `MFA direset. Session dicabut: ${result.revokedSessions}, perangkat tepercaya dicabut: ${result.revokedTrustedDevices}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
