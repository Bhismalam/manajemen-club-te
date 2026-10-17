import { CalendarDays, Clock, MapPin } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PaginationLinks } from "@/components/shared/pagination-links";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatDate, formatTime, formatWeekdayDate, toClubDateInput } from "@/lib/format";
import { dateOnly } from "@/lib/validations/common";
import type { Actor } from "@/lib/permissions/types";
import type { TrainingSessionFilter } from "@/lib/validations/training";
import { listTrainingSessions } from "@/services/training-session-service";
import type { GroupOption } from "@/services/training-group-service";

// Daftar sesi latihan untuk admin & pelatih, dikelompokkan per hari (jam klub).
export async function SessionList({
  actor,
  filter,
  groups,
  basePath,
}: {
  actor: Actor;
  filter: TrainingSessionFilter;
  groups: GroupOption[];
  basePath: string;
}) {
  const { items, total, page, pageSize, from, to } = await listTrainingSessions(actor, filter);
  const isFiltered = Boolean(filter.group || filter.from || filter.to);

  const days = new Map<string, typeof items>();
  for (const session of items) {
    const key = toClubDateInput(session.startsAt);
    days.set(key, [...(days.get(key) ?? []), session]);
  }

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Kelompok</span>
          <NativeSelect name="group" defaultValue={filter.group}>
            <NativeSelectOption value="">Semua kelompok</NativeSelectOption>
            {groups.map((group) => (
              <NativeSelectOption key={group.id} value={group.id}>
                {group.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Dari tanggal</span>
          <Input type="date" name="from" defaultValue={from ?? ""} className="sm:w-44" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Sampai tanggal</span>
          <Input type="date" name="to" defaultValue={to ?? ""} className="sm:w-44" />
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
          icon={CalendarDays}
          title={isFiltered ? "Tidak ada sesi di rentang ini" : "Belum ada jadwal latihan"}
          description={
            isFiltered
              ? "Ubah kelompok atau rentang tanggal."
              : "Buat sesi latihan agar muncul di jadwal atlet."
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {[...days.entries()].map(([day, sessions]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="font-sans text-sm font-semibold text-muted-foreground">
                {formatWeekdayDate(sessions[0]!.startsAt)}
              </h2>
              <ul className="divide-y rounded-xl border bg-card">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`${basePath}/${session.id}`}
                      className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted sm:flex-row sm:items-center sm:gap-6"
                    >
                      <span className="numeric flex items-center gap-1.5 text-sm whitespace-nowrap sm:w-32">
                        <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {formatTime(session.startsAt)}–{formatTime(session.endsAt)}
                      </span>
                      <span className="flex-1">
                        <span className="font-medium">{session.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          · {session.trainingGroup.name}
                        </span>
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          {session.location}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground sm:w-28 sm:text-right">
                        {session._count.attendances > 0
                          ? `${session._count.attendances} absensi`
                          : "Belum absen"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <span className="numeric">{total}</span> sesi
        {from && ` ${to ? "dari" : "mulai"} ${formatDate(dateOnly(from))}`}
        {to && ` sampai ${formatDate(dateOnly(to))}`}
      </p>
      <PaginationLinks
        basePath={basePath}
        params={{ group: filter.group, from: filter.from, to: filter.to }}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
