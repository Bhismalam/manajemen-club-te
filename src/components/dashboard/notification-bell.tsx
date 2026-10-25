import { Bell } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { countUnreadNotifications } from "@/services/notification-service";

// Ikon notifikasi admin di header, dengan jumlah pendaftaran event yang belum dibaca.
// Membaca session: wajib di dalam <Suspense>.
export async function NotificationBell() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  const unread = await countUnreadNotifications(user.id);
  const label = unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi";

  return (
    <Link
      href="/admin#notifikasi"
      aria-label={label}
      title={label}
      className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 && (
        <span className="numeric absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
