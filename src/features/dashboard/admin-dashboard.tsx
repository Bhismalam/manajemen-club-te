import { Bell, CalendarCheck, UserCog, Users } from "lucide-react";
import Link from "next/link";

import { SectionCard, SectionEmpty } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { AUDIT_ACTION_LABEL } from "@/constants/labels";
import {
  eventDateRange,
  RegistrationWindowBadge,
} from "@/features/competition-registrations/event-summary";
import { NotificationList } from "@/features/competition-registrations/notification-list";
import { formatDateTime, formatTime, formatWeekdayDate } from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import { getAdminDashboard } from "@/services/dashboard-service";
import { countUnreadNotifications, listRecentNotifications } from "@/services/notification-service";

import { AttendanceBar } from "./attendance-bar";

// Ringkasan admin: angka utama, latihan & event terdekat, kehadiran 30 hari, notifikasi, aktivitas.
export async function AdminDashboard({ actor }: { actor: Actor }) {
  const now = new Date();
  const [data, unread, notifications] = await Promise.all([
    getAdminDashboard(actor, now),
    countUnreadNotifications(actor.userId),
    listRecentNotifications(actor.userId, 5),
  ]);
  const { counts, sessions, events, attendance, activity } = data;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Pendaftaran baru"
          value={unread}
          icon={Bell}
          href="#notifikasi"
          hint="belum dibaca"
        />
        <StatCard label="Atlet aktif" value={counts.athletes} icon={Users} href="/admin/athletes" />
        <StatCard
          label="Pelatih aktif"
          value={counts.coaches}
          icon={UserCog}
          href="/admin/coaches"
        />
        <StatCard
          label="Kehadiran"
          value={attendance.overall.rate}
          suffix="%"
          icon={CalendarCheck}
          href="/admin/attendance"
          hint="30 hari terakhir"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Latihan terdekat" href="/admin/training">
          {sessions.length === 0 ? (
            <SectionEmpty>Belum ada jadwal latihan ke depan.</SectionEmpty>
          ) : (
            <ul className="flex flex-col divide-y">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={`/admin/training/${session.id}`}
                    className="flex flex-col gap-0.5 py-2 outline-none hover:text-primary focus-visible:text-primary"
                  >
                    <span className="text-sm font-medium">
                      {session.title}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {session.trainingGroup.name}
                      </span>
                    </span>
                    <span className="numeric text-xs text-muted-foreground">
                      {formatWeekdayDate(session.startsAt)} · {formatTime(session.startsAt)}–
                      {formatTime(session.endsAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Event terdekat" href="/admin/competitions">
          {events.length === 0 ? (
            <SectionEmpty>Belum ada event yang dipublikasikan.</SectionEmpty>
          ) : (
            <ul className="flex flex-col divide-y">
              {events.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/admin/competitions/${event.id}/registrations`}
                    className="flex flex-col gap-1 py-2 outline-none hover:text-primary focus-visible:text-primary"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">{event.name}</span>
                      <span className="text-xs text-muted-foreground">
                        <span className="numeric">{event._count.registrations}</span> pendaftar
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {eventDateRange(event.startDate, event.endDate)} · {event.location}
                      <RegistrationWindowBadge event={event} now={now} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Kehadiran per kelompok"
          description="30 hari terakhir, dari absensi yang tercatat."
          href="/admin/attendance"
          linkLabel="Rekap"
        >
          {attendance.byGroup.length === 0 ? (
            <SectionEmpty>Belum ada absensi dalam 30 hari terakhir.</SectionEmpty>
          ) : (
            <ul className="flex flex-col gap-3">
              {attendance.byGroup.map((group) => (
                <li key={group.id}>
                  <AttendanceBar label={group.name} counts={group.counts} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Aktivitas terbaru">
          {activity.length === 0 ? (
            <SectionEmpty>Belum ada aktivitas.</SectionEmpty>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {activity.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium">{item.actor?.name ?? "Sistem"}</span>{" "}
                    <span className="text-muted-foreground">
                      {AUDIT_ACTION_LABEL[item.action] ?? item.action}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div id="notifikasi" className="scroll-mt-20">
        <NotificationList notifications={notifications} unread={unread} />
      </div>
    </>
  );
}
