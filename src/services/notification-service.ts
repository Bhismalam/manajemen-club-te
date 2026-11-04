import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

// Notifikasi in-app milik user yang sedang login (doc/PRD.md §4.9.3).

// Kirim ke semua admin aktif, kecuali pelaku aksinya sendiri.
export async function notifyAdmins(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  notification: { type: NotificationType; title: string; message: string; linkUrl: string },
) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null, id: { not: actorUserId } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await tx.notification.createMany({
    data: admins.map((admin) => ({ userId: admin.id, ...notification })),
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function listRecentNotifications(userId: string, take = 6) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      linkUrl: true,
      readAt: true,
      createdAt: true,
    },
  });
}

// Tandai dibaca: semua milik user, atau hanya yang mengarah ke satu halaman.
export async function markNotificationsRead(userId: string, linkUrl?: string, now = new Date()) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(linkUrl ? { linkUrl } : {}) },
    data: { readAt: now },
  });
  return count;
}
