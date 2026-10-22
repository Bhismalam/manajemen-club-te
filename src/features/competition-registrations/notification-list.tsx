import { Bell } from "lucide-react";
import Link from "next/link";

import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { listRecentNotifications } from "@/services/notification-service";

import { MarkAllReadButton } from "./mark-all-read-button";

type Notification = Awaited<ReturnType<typeof listRecentNotifications>>[number];

// Notifikasi pendaftaran event terbaru untuk ringkasan admin. Yang belum dibaca ditandai titik.
export function NotificationList({
  notifications,
  unread,
}: {
  notifications: Notification[];
  unread: number;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
          Pendaftaran event
          {unread > 0 && (
            <span className="numeric rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {unread} baru
            </span>
          )}
        </h2>
        {unread > 0 && <MarkAllReadButton />}
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada aktivitas pendaftaran.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {notifications.map((n) => {
            const body = (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.readAt ? "bg-transparent" : "bg-primary",
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("text-sm", !n.readAt && "font-medium")}>
                    {n.title}
                    {!n.readAt && <span className="sr-only"> (belum dibaca)</span>}
                  </span>
                  <span className="text-sm text-muted-foreground">{n.message}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(n.createdAt)}
                </span>
              </>
            );
            return (
              <li key={n.id}>
                {n.linkUrl ? (
                  <Link
                    href={n.linkUrl}
                    className="flex gap-3 rounded-md px-1 py-2.5 outline-none hover:bg-muted/50 focus-visible:bg-muted"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-3 px-1 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
