import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { writeAuditLog } from "@/services/audit-log-service";

// Prefix identifier record "trust device" yang dibuat plugin twoFactor Better Auth
// di tabel verification (value = userId).
const TRUST_DEVICE_IDENTIFIER_PREFIX = "trust-device-";

type MfaDb = Pick<PrismaClient, "$transaction">;
type VerificationDb = Pick<PrismaClient, "verification"> | Prisma.TransactionClient;

// Hapus semua perangkat tepercaya milik user, sehingga login berikutnya wajib kode MFA.
// Wajib dipanggil saat user dipromosikan menjadi ADMIN (Phase 5).
export async function revokeTrustedDevices(db: VerificationDb, userId: string): Promise<number> {
  const { count } = await db.verification.deleteMany({
    where: { identifier: { startsWith: TRUST_DEVICE_IDENTIFIER_PREFIX }, value: userId },
  });
  return count;
}

export type ResetMfaResult = { revokedSessions: number; revokedTrustedDevices: number };

// Reset MFA user: hapus secret TOTP & recovery codes, cabut semua session dan perangkat tepercaya.
// User wajib setup ulang MFA (admin dipaksa oleh requireAdmin, role lain opsional).
// Otorisasi dilakukan oleh pemanggil (server action / script CLI).
export async function resetUserMfa(
  db: MfaDb,
  params: { targetUserId: string; actorUserId: string | null; reason: string },
): Promise<ResetMfaResult> {
  return db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: params.targetUserId },
      select: { id: true, email: true, role: true },
    });
    if (!target) throw new Error("USER_NOT_FOUND");

    await tx.twoFactor.deleteMany({ where: { userId: target.id } });
    await tx.user.update({ where: { id: target.id }, data: { twoFactorEnabled: false } });
    const sessions = await tx.session.deleteMany({ where: { userId: target.id } });
    const revokedTrustedDevices = await revokeTrustedDevices(tx, target.id);

    await writeAuditLog(tx, {
      actorUserId: params.actorUserId,
      action: "mfa.reset",
      entityType: "User",
      entityId: target.id,
      metadata: { reason: params.reason, targetRole: target.role },
    });

    return { revokedSessions: sessions.count, revokedTrustedDevices };
  });
}
