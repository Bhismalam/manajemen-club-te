import { CalendarDays, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatTime, formatWeekdayDate, toClubDateInput } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { getAthleteSchedule } from "@/services/training-session-service";

export const metadata: Metadata = { title: "Jadwal" };

export default function SchedulePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Schedule />
    </Suspense>
  );
}

async function Schedule() {
  const actor = await requireActor("ATHLETE");
  const now = new Date();
  const { group, sessions } = await getAthleteSchedule(actor, now);
  const today = toClubDateInput(now);

  return (
    <>
      <PageHeader
        title="Jadwal latihan"
        description={
          group
            ? `${group.name}${group.coach ? ` · Pelatih ${group.coach.fullName}` : ""}`
            : "Kamu belum masuk kelompok latihan."
        }
      />

      {!group ? (
        <EmptyState
          icon={CalendarDays}
          title="Belum ada kelompok latihan"
          description="Jadwal muncul setelah admin memasukkan kamu ke sebuah kelompok."
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Belum ada jadwal mendatang"
          description="Pelatih belum membuat sesi latihan berikutnya."
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {sessions.map((session) => {
            const isToday = toClubDateInput(session.startsAt) === today;
            const isPast = session.endsAt < now;
            return (
              <li
                key={session.id}
                className={`rounded-xl border bg-card p-4 ${isToday ? "border-primary/40" : ""} ${isPast ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {formatWeekdayDate(session.startsAt)}
                  </p>
                  {isToday && !isPast && <StatusBadge tone="info">Hari ini</StatusBadge>}
                  {isPast && <StatusBadge tone="neutral">Selesai</StatusBadge>}
                </div>
                <h2 className="mt-1 text-lg font-semibold">{session.title}</h2>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  <span className="numeric flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {formatTime(session.startsAt)}–{formatTime(session.endsAt)} WIB
                  </span>
                  {session.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {session.location}
                    </span>
                  )}
                </div>
                {session.notes && (
                  <p className="mt-3 border-t pt-3 text-sm whitespace-pre-line">{session.notes}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
