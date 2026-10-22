import "server-only";

import { prisma } from "@/lib/db/prisma";

// Notifikasi in-app milik user yang sedang login (doc/PRD.md §4.9.3).

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
