import { CalendarDays, MapPin, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { COMPETITION_LEVEL_LABEL } from "@/constants/labels";
import {
  eventDateRange,
  RegistrationWindowBadge,
} from "@/features/competition-registrations/event-summary";
import { requireActor } from "@/lib/permissions/actor";
import { listAthleteEvents } from "@/services/competition-registration-service";

export const metadata: Metadata = { title: "Event" };

export default function AthleteEventsPage() {
  return (
    <>
      <PageHeader
        title="Event"
        description="Kejuaraan yang akan datang. Pilih event untuk mendaftar dan unduh PDF-nya."
      />
      <Suspense fallback={<PageSkeleton />}>
        <EventList />
      </Suspense>
    </>
  );
}

async function EventList() {
  const actor = await requireActor("ATHLETE");
  const now = new Date();
  const events = await listAthleteEvents(actor, now);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Belum ada event"
        description="Event yang dipublikasikan pelatih atau admin akan muncul di sini."
      />
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/athlete/events/${event.id}`}
            className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-semibold">{event.name}</span>
              {event.myEntryCount !== null && (
                <StatusBadge tone="info">Terdaftar · {event.myEntryCount} nomor</StatusBadge>
              )}
            </div>
            <span className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {eventDateRange(event.startDate, event.endDate)} ·{" "}
                {COMPETITION_LEVEL_LABEL[event.level]}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden="true" />
                {event.location}
              </span>
            </span>
            <span className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <RegistrationWindowBadge event={event} now={now} />
              {event._count.disciplines} nomor lomba
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
