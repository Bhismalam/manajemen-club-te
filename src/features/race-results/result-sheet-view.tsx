import { ChevronLeft, Info, Medal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ROUND_LABEL } from "@/constants/labels";
import { eventDateRange } from "@/features/competition-registrations/event-summary";
import { CompetitionStatusBadge } from "@/features/competitions/competition-status-badge";
import { isAppError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions/types";
import { cn } from "@/lib/utils";
import type { ResultSheetFilter } from "@/lib/validations/race-results";
import { ROUND_VALUES } from "@/lib/validations/race-results";
import { getResultSheet } from "@/services/race-result-service";

import { DisciplineResultForm } from "./discipline-result-form";

async function loadSheet(...args: Parameters<typeof getResultSheet>) {
  try {
    return await getResultSheet(...args);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

// Lembar input hasil lomba satu event (admin: semua peserta, pelatih: atlet binaan).
export async function ResultSheetView({
  actor,
  competitionId,
  filter,
  basePath,
}: {
  actor: Actor;
  competitionId: string;
  filter: ResultSheetFilter;
  basePath: string;
}) {
  const { competition, disciplines, roundCounts, canRecord } = await loadSheet(
    actor,
    competitionId,
    filter,
  );
  const sheetPath = `${basePath}/${competition.id}`;
  const href = (patch: Partial<ResultSheetFilter>) => {
    const params = new URLSearchParams();
    const next = { ...filter, ...patch };
    if (next.round !== "TIME_FINAL") params.set("round", next.round);
    if (next.discipline) params.set("discipline", next.discipline);
    const query = params.toString();
    return query ? `${sheetPath}?${query}` : sheetPath;
  };

  return (
    <>
      <Link
        href={basePath}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 self-start" })}
      >
        <ChevronLeft />
        Semua event
      </Link>
      <PageHeader
        title={competition.name}
        description={`${eventDateRange(competition.startDate, competition.endDate)} · ${competition.location}`}
        actions={<CompetitionStatusBadge status={competition.status} />}
      />

      {!canRecord && (
        <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Hasil bisa dicatat saat event berlangsung, sudah selesai, atau tanggal mulainya sudah
          tiba.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <nav aria-label="Babak" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {ROUND_VALUES.map((round) => (
            <Link
              key={round}
              href={href({ round })}
              aria-current={filter.round === round ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter.round === round
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ROUND_LABEL[round]}
              {roundCounts[round] ? (
                <span className="numeric ml-1.5 text-xs text-muted-foreground">
                  {roundCounts[round]}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex items-end gap-2">
          {filter.round !== "TIME_FINAL" && (
            <input type="hidden" name="round" value={filter.round} />
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Nomor lomba</span>
            <NativeSelect name="discipline" defaultValue={filter.discipline}>
              <NativeSelectOption value="">Semua nomor</NativeSelectOption>
              {competition.disciplineOptions.map((d) => (
                <NativeSelectOption key={d.id} value={d.id}>
                  {d.name} · {d.poolLength}m
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <Button type="submit" variant="secondary">
            Tampilkan
          </Button>
        </form>
      </div>

      {disciplines.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="Belum ada peserta"
          description={
            actor.role === "COACH"
              ? "Belum ada atlet binaanmu yang terdaftar di nomor ini."
              : "Belum ada atlet yang terdaftar di nomor ini."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {disciplines.map((discipline) => (
            <section key={discipline.id} className="overflow-hidden rounded-xl border bg-card">
              <h2 className="flex items-baseline justify-between gap-2 border-b px-4 py-3 font-semibold">
                <span>
                  {discipline.name}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    · {discipline.poolLength}m · {ROUND_LABEL[filter.round]}
                  </span>
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {discipline.rows.filter((row) => row.result).length}/{discipline.rows.length}{" "}
                  tercatat
                </span>
              </h2>
              <DisciplineResultForm
                key={`${filter.round}-${discipline.id}`}
                competitionId={competition.id}
                round={filter.round}
                rows={discipline.rows}
                canRecord={canRecord}
              />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
