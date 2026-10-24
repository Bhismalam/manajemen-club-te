"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { MEDAL_LABEL, RESULT_STATUS_LABEL } from "@/constants/labels";
import type { Round } from "@/generated/prisma/enums";
import { formatDelta, formatDuration, parseDuration } from "@/lib/duration";
import { medalForRank, seedDelta } from "@/lib/race-results";
import { cn } from "@/lib/utils";
import type { ResultRowInput } from "@/lib/validations/race-results";
import {
  MEDAL_VALUES,
  RESULT_STATUS_VALUES,
  resultRowSchema,
} from "@/lib/validations/race-results";
import type { ResultSheet } from "@/services/race-result-service";

import { saveResultsAction } from "./race-result-actions";

type SheetRow = ResultSheet["disciplines"][number]["rows"][number];
type RowValues = Omit<ResultRowInput, "entryId">;

function initialValues(row: SheetRow): RowValues {
  const result = row.result;
  return {
    status: result?.status ?? "",
    time: result?.durationMs ? formatDuration(result.durationMs) : "",
    rank: result?.rank?.toString() ?? "",
    medal: result?.medal ?? "NONE",
    note: result?.note ?? "",
  };
}

function sameValues(a: RowValues, b: RowValues) {
  return (
    a.status === b.status &&
    a.time.trim() === b.time.trim() &&
    a.rank.trim() === b.rank.trim() &&
    a.medal === b.medal &&
    a.note.trim() === b.note.trim()
  );
}

const SHORT_STATUS = { FINISHED: "Finish", DNS: "DNS", DNF: "DNF", DSQ: "DSQ" } as const;

// Lembar input hasil satu nomor lomba untuk satu babak. Hanya baris yang berubah dikirim.
export function DisciplineResultForm({
  competitionId,
  round,
  rows,
  canRecord,
}: {
  competitionId: string;
  round: Round;
  rows: SheetRow[];
  canRecord: boolean;
}) {
  const [edits, setEdits] = useState<Record<string, RowValues>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const valuesOf = (row: SheetRow) => edits[row.entryId] ?? initialValues(row);
  const dirtyRows = rows.filter(
    (row) => edits[row.entryId] && !sameValues(edits[row.entryId]!, initialValues(row)),
  );

  function update(row: SheetRow, patch: Partial<RowValues>) {
    const current = valuesOf(row);
    let next = { ...current, ...patch };

    if (patch.status !== undefined && patch.status !== "FINISHED") {
      next = { ...next, time: "", rank: "", medal: "NONE" };
    }
    if (patch.time !== undefined && current.status === "" && patch.time.trim() !== "") {
      next.status = "FINISHED";
    }
    // Isi medali otomatis dari peringkat selama medali belum diubah manual.
    if (patch.rank !== undefined) {
      const previousAuto = medalForRank(Number(current.rank) || null, round);
      if (current.medal === previousAuto)
        next.medal = medalForRank(Number(patch.rank) || null, round);
    }
    setEdits((all) => ({ ...all, [row.entryId]: next }));
    setErrors((all) => {
      const rest = { ...all };
      delete rest[row.entryId];
      return rest;
    });
  }

  function save() {
    const payload: ResultRowInput[] = [];
    const nextErrors: Record<string, string> = {};
    for (const row of dirtyRows) {
      const parsed = resultRowSchema.safeParse({ entryId: row.entryId, ...valuesOf(row) });
      if (parsed.success) payload.push(parsed.data);
      else nextErrors[row.entryId] = parsed.error.issues[0]?.message ?? "Isian tidak valid.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Periksa baris yang ditandai merah.");
      return;
    }

    startTransition(async () => {
      const result = await saveResultsAction({ competitionId, round, rows: payload });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setEdits({});
      toast.success(result.message ?? "Tersimpan.");
      for (const pb of result.data.newPbs) {
        toast.success(
          `PB baru! ${pb.athleteName} · ${pb.discipline} ${formatDuration(pb.durationMs)}${
            pb.previousMs !== null ? ` (${formatDelta(pb.durationMs - pb.previousMs)})` : ""
          }`,
        );
      }
    });
  }

  return (
    <div className="flex flex-col">
      <div className="hidden gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,2fr)_8.5rem_6.5rem_4.5rem_8rem_minmax(0,1.4fr)]">
        <span>Atlet</span>
        <span>Status</span>
        <span>Waktu</span>
        <span>Peringkat</span>
        <span>Medali</span>
        <span>Catatan</span>
      </div>
      <ul className="divide-y">
        {rows.map((row) => {
          const values = valuesOf(row);
          const finished = values.status === "FINISHED";
          const dirty = dirtyRows.includes(row);
          const error = errors[row.entryId];
          const delta = row.result ? seedDelta(row.result, row.seedTimeMs) : null;
          const id = (field: string) => `${row.entryId}-${field}`;
          return (
            <li
              key={row.entryId}
              className={cn(
                "grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-[minmax(0,2fr)_8.5rem_6.5rem_4.5rem_8rem_minmax(0,1.4fr)] md:items-start",
                dirty && "bg-muted/60",
                error && "bg-destructive/5",
              )}
            >
              <div className="col-span-2 flex min-w-0 flex-col gap-0.5 md:col-span-1">
                <span className="flex flex-wrap items-center gap-1.5 font-medium">
                  {row.athleteName}
                  {row.isCurrentPb && <StatusBadge tone="success">PB</StatusBadge>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.groupName ?? "—"} · seed{" "}
                  <span className="numeric">
                    {row.seedTimeMs ? formatDuration(row.seedTimeMs) : "—"}
                  </span>
                  {delta !== null && (
                    <span
                      className={cn(
                        "numeric ml-1",
                        delta < 0 ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      ({formatDelta(delta)})
                    </span>
                  )}
                </span>
                {error && <span className="text-xs text-destructive">{error}</span>}
              </div>

              <label className="flex flex-col gap-1 text-xs md:contents">
                <span className="text-muted-foreground md:sr-only">Status</span>
                <NativeSelect
                  id={id("status")}
                  className="w-full"
                  disabled={!canRecord || pending}
                  value={values.status}
                  aria-label={`Status ${row.athleteName}`}
                  onChange={(event) =>
                    update(row, { status: event.target.value as RowValues["status"] })
                  }
                >
                  <NativeSelectOption value="">— belum ada —</NativeSelectOption>
                  {RESULT_STATUS_VALUES.map((status) => (
                    <NativeSelectOption
                      key={status}
                      value={status}
                      title={RESULT_STATUS_LABEL[status]}
                    >
                      {SHORT_STATUS[status]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>

              <label className="flex flex-col gap-1 text-xs md:contents">
                <span className="text-muted-foreground md:sr-only">Waktu</span>
                <Input
                  id={id("time")}
                  inputMode="decimal"
                  placeholder={finished || values.status === "" ? "31.20" : "—"}
                  className="numeric"
                  disabled={!canRecord || pending || (values.status !== "" && !finished)}
                  value={values.time}
                  aria-label={`Waktu ${row.athleteName}`}
                  aria-invalid={
                    finished && values.time !== "" && parseDuration(values.time) === null
                  }
                  onChange={(event) => update(row, { time: event.target.value })}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs md:contents">
                <span className="text-muted-foreground md:sr-only">Peringkat</span>
                <Input
                  id={id("rank")}
                  inputMode="numeric"
                  placeholder="—"
                  disabled={!canRecord || pending || !finished}
                  value={values.rank}
                  aria-label={`Peringkat ${row.athleteName}`}
                  onChange={(event) => update(row, { rank: event.target.value })}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs md:contents">
                <span className="text-muted-foreground md:sr-only">Medali</span>
                <NativeSelect
                  id={id("medal")}
                  className="w-full"
                  disabled={!canRecord || pending || !finished}
                  value={values.medal}
                  aria-label={`Medali ${row.athleteName}`}
                  onChange={(event) =>
                    update(row, { medal: event.target.value as RowValues["medal"] })
                  }
                >
                  {MEDAL_VALUES.map((medal) => (
                    <NativeSelectOption key={medal} value={medal}>
                      {medal === "NONE" ? "—" : MEDAL_LABEL[medal]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>

              <label className="col-span-2 flex flex-col gap-1 text-xs md:contents">
                <span className="text-muted-foreground md:sr-only">Catatan</span>
                <Input
                  id={id("note")}
                  placeholder="opsional"
                  maxLength={200}
                  disabled={!canRecord || pending || values.status === ""}
                  value={values.note}
                  aria-label={`Catatan ${row.athleteName}`}
                  onChange={(event) => update(row, { note: event.target.value })}
                />
              </label>
            </li>
          );
        })}
      </ul>
      {canRecord && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {dirtyRows.length > 0
              ? `${dirtyRows.length} baris berubah`
              : "Pilih status “— belum ada —” untuk menghapus hasil."}
          </p>
          <div className="flex gap-2">
            {dirtyRows.length > 0 && (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setEdits({});
                  setErrors({});
                }}
              >
                Batal
              </Button>
            )}
            <Button disabled={pending || dirtyRows.length === 0} onClick={save}>
              {pending ? "Menyimpan…" : "Simpan hasil"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
