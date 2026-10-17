import { Timer, Trophy } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PaginationLinks } from "@/components/shared/pagination-links";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/duration";
import { formatWeekdayDate } from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import type { TimeTrialFilter } from "@/lib/validations/time-trials";
import type { AthleteOption, DisciplineOption } from "@/services/time-trial-service";
import { listTimeTrials } from "@/services/time-trial-service";

// Daftar time trial (admin, pelatih, atlet). `detailBasePath` null = tanpa link detail (atlet).
export async function TimeTrialList({
  actor,
  filter,
  athletes,
  disciplines,
  basePath,
  detailBasePath,
}: {
  actor: Actor;
  filter: TimeTrialFilter;
  athletes: AthleteOption[] | null;
  disciplines: DisciplineOption[];
  basePath: string;
  detailBasePath: string | null;
}) {
  const { items, total, page, pageSize } = await listTimeTrials(actor, filter);
  const isFiltered = Boolean(filter.athlete || filter.discipline);

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        {athletes && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Atlet</span>
            <NativeSelect name="athlete" defaultValue={filter.athlete}>
              <NativeSelectOption value="">Semua atlet</NativeSelectOption>
              {athletes.map((athlete) => (
                <NativeSelectOption key={athlete.id} value={athlete.id}>
                  {athlete.fullName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Nomor lomba</span>
          <NativeSelect name="discipline" defaultValue={filter.discipline}>
            <NativeSelectOption value="">Semua nomor</NativeSelectOption>
            {disciplines.map((discipline) => (
              <NativeSelectOption key={discipline.id} value={discipline.id}>
                {discipline.name}
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
          icon={Timer}
          title={isFiltered ? "Tidak ada time trial yang cocok" : "Belum ada time trial"}
          description={
            isFiltered
              ? "Ubah filter atlet atau nomor lomba."
              : detailBasePath
                ? "Catat time trial pertama untuk mulai memantau PB atlet."
                : "Waktu latihanmu akan muncul di sini setelah pelatih mencatatnya."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Tanggal</TableHead>
                {athletes && <TableHead>Atlet</TableHead>}
                <TableHead>Nomor</TableHead>
                <TableHead className="text-right">Waktu</TableHead>
                <TableHead className="pr-4">Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((trial) => (
                <TableRow key={trial.id}>
                  <TableCell className="pl-4 whitespace-nowrap">
                    {detailBasePath ? (
                      <Link
                        href={`${detailBasePath}/${trial.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {formatWeekdayDate(trial.trialDate)}
                      </Link>
                    ) : (
                      formatWeekdayDate(trial.trialDate)
                    )}
                  </TableCell>
                  {athletes && (
                    <TableCell className="font-medium">{trial.athlete.fullName}</TableCell>
                  )}
                  <TableCell>{trial.discipline.name}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-2">
                      {trial.isCurrentPb && (
                        <StatusBadge tone="success">
                          <Trophy className="size-3" aria-hidden="true" />
                          PB
                        </StatusBadge>
                      )}
                      <span className="numeric text-base font-semibold">
                        {formatDuration(trial.durationMs)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate pr-4 text-muted-foreground">
                    {trial.note ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <span className="numeric">{total}</span> time trial
      </p>
      <PaginationLinks
        basePath={basePath}
        params={{ athlete: filter.athlete, discipline: filter.discipline }}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
