import { CalendarDays, MapPin, Trophy } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PaginationLinks } from "@/components/shared/pagination-links";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { COMPETITION_LEVEL_LABEL, COMPETITION_STATUS_LABEL } from "@/constants/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import type { CompetitionFilter } from "@/lib/validations/competitions";
import { COMPETITION_STATUS_VALUES } from "@/lib/validations/competitions";
import { listCompetitions } from "@/services/competition-service";

import { CompetitionStatusBadge } from "./competition-status-badge";

function dateRange(start: Date, end: Date) {
  return start.getTime() === end.getTime()
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}

// Daftar event untuk admin & pelatih, terbaru di atas.
export async function CompetitionList({
  actor,
  filter,
  basePath,
}: {
  actor: Actor;
  filter: CompetitionFilter;
  basePath: string;
}) {
  const { items, total, page, pageSize } = await listCompetitions(actor, filter);
  const isFiltered = Boolean(filter.q || filter.status);

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-sm sm:w-72">
          <span className="text-muted-foreground">Cari</span>
          <Input name="q" defaultValue={filter.q} placeholder="Nama event atau lokasi" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <NativeSelect name="status" defaultValue={filter.status ?? ""}>
            <NativeSelectOption value="">Semua status</NativeSelectOption>
            {COMPETITION_STATUS_VALUES.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {COMPETITION_STATUS_LABEL[status]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
        {isFiltered && (
          <Link href={basePath} className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={isFiltered ? "Tidak ada event yang cocok" : "Belum ada event"}
          description={
            isFiltered
              ? "Ubah kata kunci atau status."
              : "Buat event agar atlet bisa mendaftar ke nomor lombanya."
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`${basePath}/${item.id}`}
                className="flex flex-col gap-2 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted md:flex-row md:items-center md:gap-6"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <CompetitionStatusBadge status={item.status} />
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {dateRange(item.startDate, item.endDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {item.location}
                    </span>
                    <span>{COMPETITION_LEVEL_LABEL[item.level]}</span>
                  </span>
                </span>
                <span className="flex gap-4 text-sm text-muted-foreground md:flex-col md:gap-0 md:text-right">
                  <span>
                    <span className="numeric">{item._count.disciplines}</span> nomor ·{" "}
                    <span className="numeric">{item._count.registrations}</span> pendaftar
                  </span>
                  <span>
                    {item.registrationClosesAt
                      ? `Deadline ${formatDateTime(item.registrationClosesAt)}`
                      : "Periode pendaftaran belum diatur"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        <span className="numeric">{total}</span> event
      </p>
      <PaginationLinks
        basePath={basePath}
        params={{ q: filter.q, status: filter.status }}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
