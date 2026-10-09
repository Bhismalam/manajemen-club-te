import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export type AuditEntry = {
  // Null untuk aksi sistem (mis. script CLI).
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type AuditDb = Pick<PrismaClient, "auditLog"> | Prisma.TransactionClient;

// Menerima client Prisma sebagai argumen agar bisa dipakai di dalam transaksi
// dan oleh script CLI (yang tidak boleh meng-import modul "server-only").
export async function writeAuditLog(db: AuditDb, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata,
    },
  });
}
