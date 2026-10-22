"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { COMPETITION_LEVEL_LABEL } from "@/constants/labels";
import { CLUB_TIME_ZONE_LABEL } from "@/lib/format";
import type { CompetitionInput } from "@/lib/validations/competitions";
import {
  COMPETITION_LEVEL_VALUES,
  competitionSchema,
  MAX_ENTRIES_LIMIT,
} from "@/lib/validations/competitions";
import type { DisciplineOption } from "@/services/time-trial-service";

import { createCompetitionAction, updateCompetitionAction } from "./competition-actions";
import { DisciplinePicker } from "./discipline-picker";

const FIELDS = [
  "name",
  "description",
  "location",
  "level",
  "startDate",
  "endDate",
  "registrationOpensDate",
  "registrationOpensTime",
  "registrationClosesDate",
  "registrationClosesTime",
  "maxEntriesPerAthlete",
  "disciplineIds",
] as const;

// Form buat (tanpa competitionId) & edit event. Event baru selalu tersimpan sebagai draft.
export function CompetitionForm({
  competitionId,
  defaults,
  disciplines,
  lockedDisciplineIds,
  basePath,
}: {
  competitionId?: string;
  defaults: CompetitionInput;
  disciplines: DisciplineOption[];
  lockedDisciplineIds?: string[];
  basePath: string;
}) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CompetitionInput>({
    resolver: zodResolver(competitionSchema),
    defaultValues: defaults,
  });

  const invalid = (name: (typeof FIELDS)[number]) => Boolean(errors[name]);

  return (
    <form
      noValidate
      className="max-w-3xl"
      onSubmit={handleSubmit(async (values) => {
        const result = competitionId
          ? await updateCompetitionAction({ ...values, competitionId })
          : await createCompetitionAction(values);
        if (!result.success) {
          const field = FIELDS.find((name) => name === result.error.field);
          if (field) setError(field, { message: result.error.message });
          else toast.error(result.error.message);
          return;
        }
        toast.success(result.message ?? "Tersimpan.");
        if (competitionId) {
          reset(values);
        } else if (result.data && typeof result.data === "object" && "id" in result.data) {
          router.push(`${basePath}/${result.data.id}`);
        }
      })}
    >
      <FieldGroup>
        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor="name">Nama event</FieldLabel>
          <Input
            id="name"
            placeholder="mis. Kejuaraan Renang Antar Klub 2026"
            aria-invalid={invalid("name")}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={invalid("location")}>
            <FieldLabel htmlFor="location">Lokasi</FieldLabel>
            <Input
              id="location"
              placeholder="mis. Kolam Renang Kompyang Sujana"
              aria-invalid={invalid("location")}
              {...register("location")}
            />
            <FieldError errors={[errors.location]} />
          </Field>
          <Field data-invalid={invalid("level")}>
            <FieldLabel htmlFor="level">Tingkat</FieldLabel>
            <NativeSelect
              id="level"
              className="w-full"
              aria-invalid={invalid("level")}
              {...register("level")}
            >
              {COMPETITION_LEVEL_VALUES.map((level) => (
                <NativeSelectOption key={level} value={level}>
                  {COMPETITION_LEVEL_LABEL[level]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.level]} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={invalid("startDate")}>
            <FieldLabel htmlFor="startDate">Tanggal mulai</FieldLabel>
            <Input
              id="startDate"
              type="date"
              aria-invalid={invalid("startDate")}
              {...register("startDate")}
            />
            <FieldError errors={[errors.startDate]} />
          </Field>
          <Field data-invalid={invalid("endDate")}>
            <FieldLabel htmlFor="endDate">Tanggal selesai</FieldLabel>
            <Input
              id="endDate"
              type="date"
              aria-invalid={invalid("endDate")}
              {...register("endDate")}
            />
            <FieldError errors={[errors.endDate]} />
          </Field>
        </div>

        <FieldSet>
          <FieldLegend variant="label">Periode pendaftaran ({CLUB_TIME_ZONE_LABEL})</FieldLegend>
          <FieldDescription>
            Wajib diisi sebelum event dipublikasikan. Atlet & pelatih hanya bisa mendaftar di
            rentang ini.
          </FieldDescription>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <Field data-invalid={invalid("registrationOpensDate")}>
                <FieldLabel htmlFor="registrationOpensDate">Dibuka</FieldLabel>
                <Input
                  id="registrationOpensDate"
                  type="date"
                  aria-invalid={invalid("registrationOpensDate")}
                  {...register("registrationOpensDate")}
                />
              </Field>
              <Field data-invalid={invalid("registrationOpensTime")}>
                <FieldLabel htmlFor="registrationOpensTime">Jam</FieldLabel>
                <Input
                  id="registrationOpensTime"
                  type="time"
                  aria-invalid={invalid("registrationOpensTime")}
                  {...register("registrationOpensTime")}
                />
              </Field>
              <FieldError
                className="col-span-2"
                errors={[errors.registrationOpensDate ?? errors.registrationOpensTime]}
              />
            </div>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <Field data-invalid={invalid("registrationClosesDate")}>
                <FieldLabel htmlFor="registrationClosesDate">Ditutup (deadline)</FieldLabel>
                <Input
                  id="registrationClosesDate"
                  type="date"
                  aria-invalid={invalid("registrationClosesDate")}
                  {...register("registrationClosesDate")}
                />
              </Field>
              <Field data-invalid={invalid("registrationClosesTime")}>
                <FieldLabel htmlFor="registrationClosesTime">Jam</FieldLabel>
                <Input
                  id="registrationClosesTime"
                  type="time"
                  aria-invalid={invalid("registrationClosesTime")}
                  {...register("registrationClosesTime")}
                />
              </Field>
              <FieldError
                className="col-span-2"
                errors={[errors.registrationClosesDate ?? errors.registrationClosesTime]}
              />
            </div>
          </div>
        </FieldSet>

        <Field data-invalid={invalid("maxEntriesPerAthlete")} className="sm:max-w-xs">
          <FieldLabel htmlFor="maxEntriesPerAthlete">Maks. nomor per atlet (opsional)</FieldLabel>
          <Input
            id="maxEntriesPerAthlete"
            inputMode="numeric"
            placeholder="Tidak dibatasi"
            aria-invalid={invalid("maxEntriesPerAthlete")}
            {...register("maxEntriesPerAthlete")}
          />
          <FieldDescription>Angka 1–{MAX_ENTRIES_LIMIT}. Kosongkan jika bebas.</FieldDescription>
          <FieldError errors={[errors.maxEntriesPerAthlete]} />
        </Field>

        <Field data-invalid={invalid("description")}>
          <FieldLabel htmlFor="description">Deskripsi (opsional)</FieldLabel>
          <Textarea
            id="description"
            rows={6}
            placeholder="Ringkasan event, biaya pendaftaran, kontak panitia…"
            aria-invalid={invalid("description")}
            {...register("description")}
          />
          <FieldDescription>Detail teknis lengkap bisa dilampirkan sebagai PDF.</FieldDescription>
          <FieldError errors={[errors.description]} />
        </Field>

        <FieldSet data-invalid={invalid("disciplineIds")}>
          <FieldLegend variant="label">Nomor lomba yang dibuka</FieldLegend>
          <FieldDescription>Atlet hanya bisa memilih nomor yang dicentang.</FieldDescription>
          {disciplines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada nomor lomba aktif.</p>
          ) : (
            <Controller
              control={control}
              name="disciplineIds"
              render={({ field }) => (
                <DisciplinePicker
                  options={disciplines}
                  value={field.value}
                  onChange={field.onChange}
                  lockedIds={lockedDisciplineIds}
                  invalid={invalid("disciplineIds")}
                />
              )}
            />
          )}
          <FieldError errors={[errors.disciplineIds]} />
        </FieldSet>

        <div className="flex gap-2">
          <Button type="submit" disabled={(competitionId && !isDirty) || isSubmitting}>
            {isSubmitting
              ? "Menyimpan…"
              : competitionId
                ? "Simpan perubahan"
                : "Simpan sebagai draft"}
          </Button>
          {!competitionId && (
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Batal
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
