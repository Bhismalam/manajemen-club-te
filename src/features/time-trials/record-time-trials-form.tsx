"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatDelta, formatDuration, parseDuration } from "@/lib/duration";
import type { RecordTimeTrialsInput } from "@/lib/validations/time-trials";
import { recordTimeTrialsSchema, TIME_FORMAT_HINT } from "@/lib/validations/time-trials";
import type {
  AthleteOption,
  DisciplineOption,
  RecordedResult,
  SessionOption,
} from "@/services/time-trial-service";

import { recordTimeTrialsAction } from "./time-trial-actions";

const EMPTY_ROW = { athleteId: "", time: "", note: "" };

export function RecordTimeTrialsForm({
  athletes,
  disciplines,
  sessions,
  today,
  basePath,
}: {
  athletes: AthleteOption[];
  disciplines: DisciplineOption[];
  sessions: SessionOption[];
  today: string;
  basePath: string;
}) {
  const [results, setResults] = useState<RecordedResult[] | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RecordTimeTrialsInput>({
    resolver: zodResolver(recordTimeTrialsSchema),
    defaultValues: { disciplineId: "", date: today, trainingSessionId: "", entries: [EMPTY_ROW] },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "entries" });
  const entries = useWatch({ control, name: "entries" });
  const sessionId = useWatch({ control, name: "trainingSessionId" });
  const session = sessions.find((option) => option.id === sessionId);

  function fillFromSession() {
    if (!session) return;
    const groupAthletes = athletes.filter((athlete) => athlete.groupId === session.groupId);
    const existing = getValues("entries").filter((entry) => entry.athleteId || entry.time);
    const missing = groupAthletes
      .filter((athlete) => !existing.some((entry) => entry.athleteId === athlete.id))
      .map((athlete) => ({ ...EMPTY_ROW, athleteId: athlete.id }));
    replace([...existing, ...missing].length > 0 ? [...existing, ...missing] : [EMPTY_ROW]);
  }

  const sports = [...new Set(disciplines.map((discipline) => discipline.sportType))];

  if (results) {
    const newPbs = results.filter((result) => result.isNewPb).length;
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {results.length} time trial tersimpan{newPbs > 0 && `, ${newPbs} PB baru`}.
        </p>
        <ul className="divide-y rounded-xl border bg-card">
          {results.map((result) => (
            <li
              key={result.timeTrialId}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="font-medium">{result.athleteName}</span>
              <span className="flex items-center gap-3">
                {result.isNewPb && (
                  <StatusBadge tone="success">
                    <Trophy className="size-3" aria-hidden="true" />
                    PB baru
                    {result.previousPbMs !== null &&
                      ` ${formatDelta(result.durationMs - result.previousPbMs)}`}
                  </StatusBadge>
                )}
                <span className="numeric text-base font-semibold">
                  {formatDuration(result.durationMs)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setResults(null);
              reset({ ...getValues(), entries: [EMPTY_ROW] });
            }}
          >
            Catat lagi
          </Button>
          <Link href={basePath} className={buttonVariants({ variant: "outline" })}>
            Lihat semua time trial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="max-w-3xl"
      onSubmit={handleSubmit(async (values) => {
        const result = await recordTimeTrialsAction(values);
        if (!result.success) {
          toast.error(result.error.message);
          return;
        }
        toast.success(result.message ?? "Tersimpan.");
        setResults(result.data);
      })}
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field data-invalid={Boolean(errors.disciplineId)}>
            <FieldLabel htmlFor="disciplineId">Nomor lomba</FieldLabel>
            <NativeSelect
              id="disciplineId"
              className="w-full"
              aria-invalid={Boolean(errors.disciplineId)}
              {...register("disciplineId")}
            >
              <NativeSelectOption value="">Pilih…</NativeSelectOption>
              {sports.map((sport) => (
                <optgroup key={sport} label={sport === "SWIMMING" ? "Renang" : "Finswimming"}>
                  {disciplines
                    .filter((discipline) => discipline.sportType === sport)
                    .map((discipline) => (
                      <NativeSelectOption key={discipline.id} value={discipline.id}>
                        {discipline.name} ({discipline.poolLength}m)
                      </NativeSelectOption>
                    ))}
                </optgroup>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.disciplineId]} />
          </Field>
          <Field data-invalid={Boolean(errors.trainingSessionId)}>
            <FieldLabel htmlFor="trainingSessionId">Sesi latihan (opsional)</FieldLabel>
            <NativeSelect
              id="trainingSessionId"
              className="w-full"
              {...register("trainingSessionId", {
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                  const picked = sessions.find((option) => option.id === event.target.value);
                  if (picked) setValue("date", picked.date, { shouldValidate: true });
                },
              })}
            >
              <NativeSelectOption value="">Tanpa sesi</NativeSelectOption>
              {sessions.map((option) => (
                <NativeSelectOption key={option.id} value={option.id}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.trainingSessionId]} />
          </Field>
          <Field data-invalid={Boolean(errors.date)}>
            <FieldLabel htmlFor="date">Tanggal</FieldLabel>
            <Input
              id="date"
              type="date"
              max={today}
              readOnly={Boolean(session)}
              aria-invalid={Boolean(errors.date)}
              {...register("date")}
            />
            <FieldError errors={[errors.date]} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="font-medium">Waktu atlet</legend>
            {session && (
              <Button type="button" variant="outline" size="sm" onClick={fillFromSession}>
                Isi atlet dari kelompok sesi
              </Button>
            )}
          </div>
          <FieldDescription>{TIME_FORMAT_HINT}</FieldDescription>
          <FieldError errors={[errors.entries?.root ?? errors.entries]} />

          <ul className="flex flex-col gap-2">
            {fields.map((field, index) => {
              const rowErrors = errors.entries?.[index];
              const parsed = parseDuration(entries?.[index]?.time ?? "");
              return (
                <li
                  key={field.id}
                  className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_9rem_1fr_auto] sm:items-start"
                >
                  <div>
                    <NativeSelect
                      aria-label={`Atlet baris ${index + 1}`}
                      className="w-full"
                      aria-invalid={Boolean(rowErrors?.athleteId)}
                      {...register(`entries.${index}.athleteId`)}
                    >
                      <NativeSelectOption value="">Pilih atlet…</NativeSelectOption>
                      {athletes.map((athlete) => (
                        <NativeSelectOption key={athlete.id} value={athlete.id}>
                          {athlete.fullName}
                          {athlete.groupName ? ` · ${athlete.groupName}` : ""}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[rowErrors?.athleteId]} />
                  </div>
                  <div>
                    <Input
                      aria-label={`Waktu baris ${index + 1}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="58.27"
                      className="numeric"
                      aria-invalid={Boolean(rowErrors?.time)}
                      {...register(`entries.${index}.time`)}
                    />
                    {rowErrors?.time ? (
                      <FieldError errors={[rowErrors.time]} />
                    ) : parsed !== null ? (
                      <p className="numeric mt-1 text-xs text-muted-foreground">
                        = {formatDuration(parsed)}
                      </p>
                    ) : null}
                  </div>
                  <Input
                    aria-label={`Catatan baris ${index + 1}`}
                    placeholder="Catatan (opsional)"
                    maxLength={200}
                    {...register(`entries.${index}.note`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="justify-self-end sm:justify-self-auto"
                    aria-label={`Hapus baris ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <X />
                  </Button>
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={fields.length >= 50}
            onClick={() => append(EMPTY_ROW)}
          >
            <Plus />
            Tambah atlet
          </Button>
        </fieldset>

        <Button type="submit" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan time trial"}
        </Button>
      </FieldGroup>
    </form>
  );
}
