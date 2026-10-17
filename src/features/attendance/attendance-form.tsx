"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ATTENDANCE_LABEL } from "@/constants/labels";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { cn } from "@/lib/utils";
import type { RosterRow } from "@/services/attendance-service";

import { saveAttendanceAction } from "./attendance-actions";

type Entry = { status: AttendanceStatus | null; note: string };

const TONE: Record<AttendanceStatus, string> = {
  PRESENT: "peer-checked:border-success peer-checked:bg-success/10 peer-checked:text-success",
  PERMISSION: "peer-checked:border-info peer-checked:bg-info/10 peer-checked:text-info",
  SICK: "peer-checked:border-warning peer-checked:bg-warning/10 peer-checked:text-warning",
  ABSENT:
    "peer-checked:border-destructive peer-checked:bg-destructive/10 peer-checked:text-destructive",
};

// Pencatatan absensi satu sesi. Atlet tanpa status tidak disimpan.
export function AttendanceForm({ sessionId, rows }: { sessionId: string; rows: RosterRow[] }) {
  const router = useRouter();
  const initial = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row) => [row.athleteId, { status: row.status, note: row.note }]),
      ),
    [rows],
  ) as Record<string, Entry>;
  const [entries, setEntries] = useState<Record<string, Entry>>(initial);
  const [saving, setSaving] = useState(false);

  const marked = Object.values(entries).filter((entry) => entry.status !== null).length;
  const dirty = rows.some(
    (row) =>
      entries[row.athleteId]?.status !== row.status ||
      (entries[row.athleteId]?.note ?? "") !== row.note,
  );

  function update(athleteId: string, patch: Partial<Entry>) {
    setEntries((current) => ({
      ...current,
      [athleteId]: { status: null, note: "", ...current[athleteId], ...patch },
    }));
  }

  async function save() {
    setSaving(true);
    const payload = Object.entries(entries)
      .filter(([, entry]) => entry.status !== null)
      .map(([athleteId, entry]) => ({ athleteId, status: entry.status, note: entry.note }));
    const result = await saveAttendanceAction({ sessionId, entries: payload });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(result.message ?? "Tersimpan.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="numeric">{marked}</span> dari{" "}
          <span className="numeric">{rows.length}</span> atlet sudah ditandai
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setEntries((current) =>
              Object.fromEntries(
                Object.entries(current).map(([id, entry]) => [
                  id,
                  { ...entry, status: entry.status ?? "PRESENT" },
                ]),
              ),
            )
          }
        >
          Tandai sisanya hadir
        </Button>
      </div>

      <ul className="divide-y rounded-lg border">
        {rows.map((row) => {
          const entry = entries[row.athleteId] ?? { status: null, note: "" };
          return (
            <li
              key={row.athleteId}
              className="flex flex-col gap-2 p-3 xl:flex-row xl:items-center xl:gap-3"
            >
              <div className="min-w-0 xl:w-44">
                <p className="truncate font-medium">{row.fullName}</p>
                <p className="numeric text-xs text-muted-foreground">
                  {row.athleteNumber}
                  {row.formerMember && " · sudah pindah kelompok"}
                </p>
              </div>
              <fieldset className="flex flex-wrap gap-1.5">
                <legend className="sr-only">Kehadiran {row.fullName}</legend>
                {ATTENDANCE_STATUSES.map((status) => (
                  <label key={status} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`status-${row.athleteId}`}
                      value={status}
                      checked={entry.status === status}
                      onChange={() => update(row.athleteId, { status })}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "inline-flex h-8 items-center rounded-full border px-3 text-sm text-muted-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring hover:bg-muted",
                        TONE[status],
                      )}
                    >
                      {ATTENDANCE_LABEL[status]}
                    </span>
                  </label>
                ))}
              </fieldset>
              <Input
                aria-label={`Catatan untuk ${row.fullName}`}
                placeholder="Catatan (opsional)"
                maxLength={200}
                value={entry.note}
                onChange={(event) => update(row.athleteId, { note: event.target.value })}
                className="xl:ml-auto xl:max-w-52"
              />
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={!dirty || marked === 0 || saving}>
          {saving ? "Menyimpan…" : "Simpan absensi"}
        </Button>
        {dirty && (
          <span className="text-sm text-muted-foreground">Ada perubahan belum disimpan.</span>
        )}
      </div>
    </div>
  );
}
