import { Pencil, Users } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { GENDER_LABEL } from "@/constants/labels";
import { formatDuration } from "@/lib/duration";
import { formatDate, formatDateTime } from "@/lib/format";
import { groupByDiscipline } from "@/lib/registrations";
import { cn } from "@/lib/utils";
import type { RosterFilter } from "@/lib/validations/registrations";
import { GENDER_VALUES } from "@/lib/validations/common";
import type { Roster } from "@/services/competition-registration-service";

const GENDER_SHORT = { MALE: "L", FEMALE: "P" } as const;

function seed(ms: number | null) {
  return ms === null ? "—" : formatDuration(ms);
}

function query(filter: RosterFilter, patch: Partial<Record<string, string>>) {
  const params = new URLSearchParams();
  const values: Record<string, string> = {
    view: filter.view,
    discipline: filter.discipline,
    gender: filter.gender ?? "",
    q: filter.q,
    cancelled: filter.cancelled ? "1" : "",
    ...patch,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value && !(key === "view" && value === "athlete")) params.set(key, value);
  }
  const search = params.toString();
  return search ? `?${search}` : "?";
}

// Rekap pendaftar satu event: filter, tampilan Per Atlet / Per Nomor Lomba.
export function RosterView({
  roster,
  filter,
  basePath,
}: {
  roster: Roster;
  filter: RosterFilter;
  basePath: string;
}) {
  const { competition, rows } = roster;
  const nameOf = new Map(competition.disciplines.map((d) => [d.id, d]));
  const isFiltered = Boolean(filter.discipline || filter.gender || filter.q || filter.cancelled);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Tampilan rekap"
        className="inline-flex w-fit rounded-lg bg-muted p-1"
      >
        {(
          [
            ["athlete", "Per Atlet"],
            ["discipline", "Per Nomor Lomba"],
          ] as const
        ).map(([view, label]) => (
          <Link
            key={view}
            role="tab"
            aria-selected={filter.view === view}
            href={`${basePath}${query(filter, { view })}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter.view === view
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        {filter.view !== "athlete" && <input type="hidden" name="view" value={filter.view} />}
        <label className="flex flex-col gap-1 text-sm sm:w-56">
          <span className="text-muted-foreground">Cari atlet</span>
          <Input name="q" defaultValue={filter.q} placeholder="Nama atau nomor atlet" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Nomor lomba</span>
          <NativeSelect name="discipline" defaultValue={filter.discipline}>
            <NativeSelectOption value="">Semua nomor</NativeSelectOption>
            {competition.disciplines.map((d) => (
              <NativeSelectOption key={d.id} value={d.id}>
                {d.name} · {d.poolLength}m
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Jenis kelamin</span>
          <NativeSelect name="gender" defaultValue={filter.gender ?? ""}>
            <NativeSelectOption value="">Semua</NativeSelectOption>
            {GENDER_VALUES.map((gender) => (
              <NativeSelectOption key={gender} value={gender}>
                {GENDER_LABEL[gender]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="cancelled"
            value="1"
            defaultChecked={filter.cancelled}
            className="size-4 accent-primary"
          />
          Tampilkan yang dibatalkan
        </label>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
        {isFiltered && (
          <Link
            href={`${basePath}${query({ ...filter, discipline: "", gender: undefined, q: "", cancelled: false }, {})}`}
            className={buttonVariants({ variant: "ghost" })}
          >
            Reset
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={isFiltered ? "Tidak ada pendaftar yang cocok" : "Belum ada pendaftar"}
          description={
            isFiltered
              ? "Ubah filter atau kata kunci."
              : "Pendaftaran dari atlet dan pelatih akan muncul di sini."
          }
        />
      ) : filter.view === "athlete" ? (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                "flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:gap-6",
                row.status === "CANCELLED" && "bg-muted/40",
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5 lg:w-64">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {row.athlete.fullName}
                  {row.status === "CANCELLED" && (
                    <StatusBadge tone="neutral">Dibatalkan</StatusBadge>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.athlete.athleteNumber} · {GENDER_SHORT[row.athlete.gender]} ·{" "}
                  {formatDate(row.athlete.birthDate)} · {row.athlete.trainingGroup?.name ?? "—"}
                </span>
              </div>
              <ul className="flex flex-1 flex-wrap gap-1.5">
                {row.entries.map((entry) => (
                  <li
                    key={entry.disciplineId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {nameOf.get(entry.disciplineId)?.name ?? "?"}
                    <span className="numeric text-muted-foreground">{seed(entry.seedTimeMs)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground lg:w-56 lg:justify-end">
                <span className="lg:text-right">
                  {row.status === "CANCELLED" ? "Dibatalkan" : row.registeredBy.name}
                  <br />
                  {formatDateTime(row.status === "CANCELLED" ? row.cancelledAt : row.createdAt)}
                </span>
                <Link
                  href={`${basePath}?athlete=${row.athlete.id}#kelola`}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                  aria-label={`Ubah pendaftaran ${row.athlete.fullName}`}
                >
                  <Pencil />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-4">
          {groupByDiscipline(
            competition.disciplines.filter((d) => !filter.discipline || d.id === filter.discipline),
            rows.filter((row) => row.status === "REGISTERED"),
          ).map(({ discipline, participants }) => (
            <section key={discipline.id} className="rounded-xl border bg-card">
              <h2 className="flex items-baseline justify-between gap-2 border-b px-4 py-2.5 text-sm font-semibold">
                <span>
                  {discipline.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {discipline.poolLength}m
                  </span>
                </span>
                <span className="font-normal text-muted-foreground">
                  {participants.length} peserta
                </span>
              </h2>
              {participants.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Belum ada peserta.</p>
              ) : (
                <ol className="divide-y">
                  {participants.map(({ row, seedTimeMs }, index) => (
                    <li key={row.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="numeric w-6 text-muted-foreground">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{row.athlete.fullName}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {GENDER_SHORT[row.athlete.gender]} ·{" "}
                          {row.athlete.trainingGroup?.name ?? "—"}
                        </span>
                      </span>
                      <span className="numeric">{seed(seedTimeMs)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
