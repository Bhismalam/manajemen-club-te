"use client";

import { Info } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DisciplinePicker } from "@/features/competitions/discipline-picker";
import { formatDuration } from "@/lib/duration";
import type { EditorAthlete } from "@/services/competition-registration-service";
import type { DisciplineOption } from "@/services/time-trial-service";

import {
  cancelAthleteRegistrationAction,
  cancelMyRegistrationAction,
  saveAthleteRegistrationAction,
  saveMyRegistrationAction,
} from "./registration-actions";

function activeDisciplines(athlete: EditorAthlete | undefined) {
  return athlete?.registration?.status === "REGISTERED" ? athlete.registration.disciplineIds : [];
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

// Form pendaftaran satu atlet ke satu event.
// - mode "self": atlet mendaftarkan dirinya (athleteId diambil server dari session).
// - mode "managed": pelatih/admin memilih atlet dari daftar yang boleh dikelolanya.
export function RegistrationEditor({
  competitionId,
  disciplines,
  athletes,
  mode,
  canEdit,
  closedMessage,
  maxEntries,
  initialAthleteId,
}: {
  competitionId: string;
  disciplines: DisciplineOption[];
  athletes: EditorAthlete[];
  mode: "self" | "managed";
  canEdit: boolean;
  closedMessage: string;
  maxEntries: number | null;
  initialAthleteId?: string;
}) {
  const [athleteId, setAthleteId] = useState(
    athletes.find((a) => a.id === initialAthleteId)?.id ?? athletes[0]?.id ?? "",
  );
  const athlete = athletes.find((a) => a.id === athleteId);
  const [selection, setSelection] = useState<string[]>(activeDisciplines(athlete));
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const registered = athlete?.registration?.status === "REGISTERED";
  const dirty = !sameSet(selection, activeDisciplines(athlete));
  const overLimit = maxEntries !== null && selection.length > maxEntries;

  function selectAthlete(id: string) {
    setAthleteId(id);
    setSelection(activeDisciplines(athletes.find((a) => a.id === id)));
  }

  function save() {
    startTransition(async () => {
      const payload = { competitionId, disciplineIds: selection };
      const result =
        mode === "self"
          ? await saveMyRegistrationAction(payload)
          : await saveAthleteRegistrationAction({ ...payload, athleteId });
      if (!result.success) toast.error(result.error.message);
      else toast.success(result.message ?? "Tersimpan.");
    });
  }

  async function cancel() {
    const payload = { competitionId };
    const result =
      mode === "self"
        ? await cancelMyRegistrationAction(payload)
        : await cancelAthleteRegistrationAction({ ...payload, athleteId });
    if (!result.success) {
      toast.error(result.error.message);
      return false;
    }
    toast.success(result.message ?? "Dibatalkan.");
    setSelection([]);
    return true;
  }

  if (!athlete) {
    return (
      <p className="text-sm text-muted-foreground">
        {mode === "self"
          ? "Profil atlet kamu belum aktif, jadi belum bisa mendaftar. Hubungi admin."
          : "Belum ada atlet aktif yang bisa didaftarkan."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {mode === "managed" && (
        <label className="flex flex-col gap-1.5 text-sm sm:max-w-md">
          <span className="font-medium">Atlet</span>
          <NativeSelect
            className="w-full"
            value={athleteId}
            disabled={pending}
            onChange={(event) => selectAthlete(event.target.value)}
          >
            {athletes.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.fullName}
                {a.groupName ? ` · ${a.groupName}` : ""}
                {a.registration?.status === "REGISTERED"
                  ? ` — terdaftar (${a.registration.disciplineIds.length} nomor)`
                  : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {registered ? (
          <StatusBadge tone="success">
            Terdaftar · {athlete.registration!.disciplineIds.length} nomor
          </StatusBadge>
        ) : athlete.registration?.status === "CANCELLED" ? (
          <StatusBadge tone="neutral">Dibatalkan</StatusBadge>
        ) : (
          <StatusBadge tone="info">Belum terdaftar</StatusBadge>
        )}
        {athlete.registration && (
          <span className="text-muted-foreground">
            oleh{" "}
            {mode === "self" && athlete.registration.registeredByName === athlete.fullName
              ? "kamu"
              : athlete.registration.registeredByName}
          </span>
        )}
      </div>

      {!canEdit && (
        <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {closedMessage}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Nomor lomba</p>
          <p
            className={`text-xs ${overLimit ? "font-medium text-destructive" : "text-muted-foreground"}`}
          >
            {selection.length} dipilih{maxEntries !== null && ` · maks. ${maxEntries}`}
          </p>
        </div>
        <DisciplinePicker
          options={disciplines}
          value={selection}
          onChange={setSelection}
          disabled={!canEdit || pending}
          bulkToggle={false}
          invalid={overLimit}
          renderMeta={(option) => {
            const pb = athlete.personalBests[option.id];
            return (
              <span className="numeric text-xs text-muted-foreground">
                {pb ? `PB ${formatDuration(pb)}` : "PB —"}
              </span>
            );
          }}
        />
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={save}
            disabled={pending || selection.length === 0 || overLimit || (registered && !dirty)}
          >
            {pending ? "Menyimpan…" : registered ? "Simpan perubahan" : "Daftar"}
          </Button>
          {registered && (
            <Button variant="outline" disabled={pending} onClick={() => setConfirmCancel(true)}>
              Batalkan pendaftaran
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Batalkan pendaftaran?"
        description={`${mode === "self" ? "Kamu" : athlete.fullName} tidak lagi terdaftar di event ini. Selama pendaftaran masih dibuka, bisa mendaftar lagi.`}
        confirmLabel="Batalkan pendaftaran"
        pendingLabel="Membatalkan…"
        destructive
        onConfirm={cancel}
      />
    </div>
  );
}
