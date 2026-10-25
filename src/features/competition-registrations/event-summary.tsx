import { CalendarDays, Download, MapPin, Timer, Trophy } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { COMPETITION_LEVEL_LABEL } from "@/constants/labels";
import type { CompetitionLevel, CompetitionStatus } from "@/generated/prisma/enums";
import { CLUB_TIME_ZONE_LABEL, formatDate, formatDateTime } from "@/lib/format";
import { registrationWindowState } from "@/lib/registrations";

type EventInfo = {
  id: string;
  name: string;
  status: CompetitionStatus;
  location: string;
  startDate: Date;
  endDate: Date;
  level: CompetitionLevel;
  description?: string | null;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  attachmentName?: string | null;
};

export function eventDateRange(start: Date, end: Date) {
  return start.getTime() === end.getTime()
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}

// Badge periode pendaftaran untuk kartu & detail event.
type WindowInfo = Pick<EventInfo, "status" | "registrationOpensAt" | "registrationClosesAt">;

export function RegistrationWindowBadge({ event, now }: { event: WindowInfo; now: Date }) {
  const window = registrationWindowState(event, now);
  if (event.status !== "UPCOMING" || window.state === "closed") {
    return <StatusBadge tone="neutral">Pendaftaran ditutup</StatusBadge>;
  }
  if (window.state === "not_open") {
    return <StatusBadge tone="neutral">Dibuka {formatDateTime(window.opensAt)}</StatusBadge>;
  }
  return <StatusBadge tone="success">Pendaftaran dibuka · {window.label}</StatusBadge>;
}

// Pesan saat form pendaftaran tidak bisa diubah oleh atlet/pelatih.
export function closedRegistrationMessage(event: WindowInfo, now: Date) {
  const window = registrationWindowState(event, now);
  if (event.status === "UPCOMING" && window.state === "not_open") {
    return `Pendaftaran baru dibuka ${formatDateTime(window.opensAt)} ${CLUB_TIME_ZONE_LABEL}.`;
  }
  return "Periode pendaftaran sudah ditutup. Hubungi admin jika perlu perubahan.";
}

// Ringkasan event untuk halaman pendaftaran atlet & pelatih.
export function EventSummary({ event, now }: { event: EventInfo; now: Date }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="sr-only">Tanggal</dt>
            <dd>{eventDateRange(event.startDate, event.endDate)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="sr-only">Lokasi</dt>
            <dd>{event.location}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Trophy className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="sr-only">Tingkat</dt>
            <dd>Tingkat {COMPETITION_LEVEL_LABEL[event.level]}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Timer className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="sr-only">Deadline pendaftaran</dt>
            <dd>
              {event.registrationClosesAt
                ? `Deadline ${formatDateTime(event.registrationClosesAt)} ${CLUB_TIME_ZONE_LABEL}`
                : "Deadline belum diatur"}
            </dd>
          </div>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <RegistrationWindowBadge event={event} now={now} />
        {event.attachmentName && (
          <a
            href={`/api/competitions/${event.id}/attachment`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download />
            Unduh PDF event
          </a>
        )}
      </div>
      {event.description && (
        <p className="text-sm whitespace-pre-line text-muted-foreground">{event.description}</p>
      )}
    </div>
  );
}
