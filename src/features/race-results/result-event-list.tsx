import { CalendarDays, MapPin, Medal } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { eventDateRange } from "@/features/competition-registrations/event-summary";
import { CompetitionStatusBadge } from "@/features/competitions/competition-status-badge";
import type { Actor } from "@/lib/permissions/types";
import { listResultEvents } from "@/services/race-result-service";

// Event yang punya peserta, dengan progres pencatatan hasil (entry bertanda hasil / total).
export async function ResultEventList({ actor, basePath }: { actor: Actor; basePath: string }) {
  const events = await listResultEvents(actor);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Medal}
        title="Belum ada event dengan peserta"
        description={
          actor.role === "COACH"
            ? "Daftarkan atlet binaan ke event dulu; hasilnya dicatat di sini saat event berlangsung."
            : "Event yang sudah punya pendaftar akan muncul di sini."
        }
      />
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`${basePath}/${event.id}`}
            className="flex flex-col gap-2 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted md:flex-row md:items-center md:gap-6"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{event.name}</span>
                <CompetitionStatusBadge status={event.status} />
              </span>
              <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {eventDateRange(event.startDate, event.endDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {event.location}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                <span className="numeric">{event.recordedCount}</span>/
                <span className="numeric">{event.entryCount}</span> entry tercatat
              </span>
              {event.canRecord ? (
                event.recordedCount < event.entryCount ? (
                  <StatusBadge tone="warning">Perlu diisi</StatusBadge>
                ) : (
                  <StatusBadge tone="success">Lengkap</StatusBadge>
                )
              ) : (
                <StatusBadge tone="neutral">Belum dimulai</StatusBadge>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
