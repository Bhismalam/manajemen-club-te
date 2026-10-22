"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CLUB_TIME_ZONE_LABEL } from "@/lib/format";
import type { TrainingSessionInput } from "@/lib/validations/training";
import { trainingSessionSchema } from "@/lib/validations/training";
import type { GroupOption } from "@/services/training-group-service";

import {
  createTrainingSessionAction,
  deleteTrainingSessionAction,
  updateTrainingSessionAction,
} from "./session-actions";

const FIELDS = [
  "trainingGroupId",
  "title",
  "date",
  "startTime",
  "endTime",
  "location",
  "notes",
] as const;

// Form tambah (tanpa sessionId) & edit sesi latihan. Jam diisi dalam zona waktu klub.
export function SessionForm({
  sessionId,
  defaults,
  groups,
  basePath,
}: {
  sessionId?: string;
  defaults: TrainingSessionInput;
  groups: GroupOption[];
  basePath: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TrainingSessionInput>({
    resolver: zodResolver(trainingSessionSchema),
    defaultValues: defaults,
  });

  return (
    <form
      noValidate
      className="max-w-2xl"
      onSubmit={handleSubmit(async (values) => {
        const result = sessionId
          ? await updateTrainingSessionAction({ ...values, sessionId })
          : await createTrainingSessionAction(values);
        if (!result.success) {
          const field = FIELDS.find((name) => name === result.error.field);
          if (field) setError(field, { message: result.error.message });
          else toast.error(result.error.message);
          return;
        }
        toast.success(result.message ?? "Tersimpan.");
        if (sessionId) {
          reset(values);
        } else if (result.data && typeof result.data === "object" && "id" in result.data) {
          router.push(`${basePath}/${result.data.id}`);
        }
      })}
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.trainingGroupId)}>
            <FieldLabel htmlFor="trainingGroupId">Kelompok</FieldLabel>
            <NativeSelect
              id="trainingGroupId"
              className="w-full"
              aria-invalid={Boolean(errors.trainingGroupId)}
              {...register("trainingGroupId")}
            >
              <NativeSelectOption value="">Pilih kelompok…</NativeSelectOption>
              {groups.map((group) => (
                <NativeSelectOption key={group.id} value={group.id}>
                  {group.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.trainingGroupId]} />
          </Field>
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="title">Judul</FieldLabel>
            <Input
              id="title"
              placeholder="mis. Latihan endurance"
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            <FieldError errors={[errors.title]} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field data-invalid={Boolean(errors.date)}>
            <FieldLabel htmlFor="date">Tanggal</FieldLabel>
            <Input
              id="date"
              type="date"
              aria-invalid={Boolean(errors.date)}
              {...register("date")}
            />
            <FieldError errors={[errors.date]} />
          </Field>
          <Field data-invalid={Boolean(errors.startTime)}>
            <FieldLabel htmlFor="startTime">Mulai ({CLUB_TIME_ZONE_LABEL})</FieldLabel>
            <Input
              id="startTime"
              type="time"
              aria-invalid={Boolean(errors.startTime)}
              {...register("startTime")}
            />
            <FieldError errors={[errors.startTime]} />
          </Field>
          <Field data-invalid={Boolean(errors.endTime)}>
            <FieldLabel htmlFor="endTime">Selesai ({CLUB_TIME_ZONE_LABEL})</FieldLabel>
            <Input
              id="endTime"
              type="time"
              aria-invalid={Boolean(errors.endTime)}
              {...register("endTime")}
            />
            <FieldError errors={[errors.endTime]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.location)}>
          <FieldLabel htmlFor="location">Lokasi (opsional)</FieldLabel>
          <Input id="location" placeholder="mis. Kolam Renang Utama" {...register("location")} />
          <FieldError errors={[errors.location]} />
        </Field>
        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor="notes">Catatan latihan (opsional)</FieldLabel>
          <Textarea
            id="notes"
            rows={4}
            placeholder="mis. Pemanasan 400m, 8×50m sprint, pendinginan"
            {...register("notes")}
          />
          <FieldDescription>Terlihat oleh atlet di jadwal mereka.</FieldDescription>
          <FieldError errors={[errors.notes]} />
        </Field>

        <div className="flex gap-2">
          <Button type="submit" disabled={(sessionId && !isDirty) || isSubmitting}>
            {isSubmitting ? "Menyimpan…" : sessionId ? "Simpan perubahan" : "Buat sesi"}
          </Button>
          {!sessionId && (
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Batal
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}

export function DeleteSessionButton({
  sessionId,
  basePath,
  blockedReason,
}: {
  sessionId: string;
  basePath: string;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="destructive"
        className="self-start"
        disabled={Boolean(blockedReason)}
        onClick={() => setOpen(true)}
      >
        Hapus sesi
      </Button>
      {blockedReason && <p className="text-sm text-muted-foreground">{blockedReason}</p>}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus sesi latihan ini?"
        description="Sesi hilang dari jadwal atlet dan tidak bisa dikembalikan."
        confirmLabel="Hapus"
        pendingLabel="Menghapus…"
        destructive
        onConfirm={async () => {
          const result = await deleteTrainingSessionAction({ sessionId });
          if (!result.success) {
            toast.error(result.error.message);
            return false;
          }
          toast.success(result.message ?? "Dihapus.");
          router.push(basePath);
          return true;
        }}
      />
    </div>
  );
}
