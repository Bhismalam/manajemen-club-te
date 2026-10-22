"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDuration, parseDuration } from "@/lib/duration";
import { TIME_FORMAT_HINT, updateTimeTrialSchema } from "@/lib/validations/time-trials";

import { deleteTimeTrialAction, updateTimeTrialAction } from "./time-trial-actions";

const formSchema = updateTimeTrialSchema.omit({ timeTrialId: true });
type FormValues = z.infer<typeof formSchema>;

export function EditTimeTrialForm({
  timeTrialId,
  defaults,
  today,
}: {
  timeTrialId: string;
  defaults: FormValues;
  today: string;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });
  const time = useWatch({ control, name: "time" });
  const parsed = parseDuration(time ?? "");

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const result = await updateTimeTrialAction({ ...values, timeTrialId });
        if (!result.success) {
          toast.error(result.error.message);
          return;
        }
        toast.success(result.message ?? "Tersimpan.");
        reset(values);
      })}
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.time)}>
            <FieldLabel htmlFor="time">Waktu</FieldLabel>
            <Input
              id="time"
              inputMode="decimal"
              className="numeric"
              aria-invalid={Boolean(errors.time)}
              {...register("time")}
            />
            {errors.time ? (
              <FieldError errors={[errors.time]} />
            ) : (
              <FieldDescription>
                {parsed !== null ? `= ${formatDuration(parsed)}` : TIME_FORMAT_HINT}
              </FieldDescription>
            )}
          </Field>
          <Field data-invalid={Boolean(errors.date)}>
            <FieldLabel htmlFor="date">Tanggal</FieldLabel>
            <Input
              id="date"
              type="date"
              max={today}
              aria-invalid={Boolean(errors.date)}
              {...register("date")}
            />
            <FieldError errors={[errors.date]} />
          </Field>
        </div>
        <Field data-invalid={Boolean(errors.note)}>
          <FieldLabel htmlFor="note">Catatan (opsional)</FieldLabel>
          <Input id="note" maxLength={200} {...register("note")} />
          <FieldError errors={[errors.note]} />
        </Field>
        <Button type="submit" className="self-start" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan koreksi"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function DeleteTimeTrialButton({
  timeTrialId,
  basePath,
  isPb,
}: {
  timeTrialId: string;
  basePath: string;
  isPb: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" className="self-start" onClick={() => setOpen(true)}>
        Hapus time trial
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus time trial ini?"
        description={
          isPb
            ? "Ini PB atlet saat ini. Setelah dihapus, PB kembali ke hasil terbaik berikutnya."
            : "Data waktu ini dihapus permanen."
        }
        confirmLabel="Hapus"
        pendingLabel="Menghapus…"
        destructive
        onConfirm={async () => {
          const result = await deleteTimeTrialAction({ timeTrialId });
          if (!result.success) {
            toast.error(result.error.message);
            return false;
          }
          toast.success(result.message ?? "Dihapus.");
          router.push(basePath);
          return true;
        }}
      />
    </>
  );
}
