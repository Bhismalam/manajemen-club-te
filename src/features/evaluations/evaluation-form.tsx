"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { CreateEvaluationInput } from "@/lib/validations/evaluations";
import { createEvaluationSchema } from "@/lib/validations/evaluations";

import { createEvaluationAction, updateEvaluationAction } from "./evaluation-actions";

const TEXT_FIELDS = [
  {
    name: "strengths",
    label: "Kekuatan",
    placeholder: "mis. Start dan underwater kick sangat kuat.",
  },
  {
    name: "weaknesses",
    label: "Kekurangan",
    placeholder: "mis. Kecepatan menurun di 25m terakhir.",
  },
  {
    name: "focus",
    label: "Fokus perbaikan",
    placeholder: "mis. Latihan pacing 4×100m, jaga frekuensi kayuhan.",
  },
  {
    name: "target",
    label: "Target berikutnya",
    placeholder: "mis. 100m Freestyle di bawah 1:05.00 pada kejuaraan provinsi.",
  },
] as const;

const FIELDS = ["athleteId", "evaluationDate", ...TEXT_FIELDS.map((f) => f.name), "notes"] as const;

// Form tulis (tanpa evaluationId) & ubah evaluasi. Atlet tidak bisa diganti saat mengubah.
export function EvaluationForm({
  evaluationId,
  athleteName,
  athletes = [],
  defaults,
  basePath,
}: {
  evaluationId?: string;
  athleteName?: string;
  athletes?: { id: string; fullName: string; groupName: string | null }[];
  defaults: CreateEvaluationInput;
  basePath: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateEvaluationInput>({
    resolver: zodResolver(createEvaluationSchema),
    defaultValues: defaults,
  });

  return (
    <form
      noValidate
      className="max-w-3xl"
      onSubmit={handleSubmit(async ({ athleteId, ...values }) => {
        const result = evaluationId
          ? await updateEvaluationAction({ ...values, evaluationId })
          : await createEvaluationAction({ ...values, athleteId });
        if (!result.success) {
          const field = FIELDS.find((name) => name === result.error.field);
          if (field) setError(field, { message: result.error.message });
          else toast.error(result.error.message);
          return;
        }
        toast.success(result.message ?? "Tersimpan.");
        if (evaluationId) {
          reset({ athleteId, ...values });
        } else if (result.data && typeof result.data === "object" && "id" in result.data) {
          router.push(`${basePath}/${result.data.id}`);
        }
      })}
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          {evaluationId ? (
            <Field>
              <FieldLabel htmlFor="athleteName">Atlet</FieldLabel>
              <Input id="athleteName" value={athleteName} readOnly className="bg-muted" />
              <input type="hidden" {...register("athleteId")} />
            </Field>
          ) : (
            <Field data-invalid={Boolean(errors.athleteId)}>
              <FieldLabel htmlFor="athleteId">Atlet</FieldLabel>
              <NativeSelect
                id="athleteId"
                className="w-full"
                aria-invalid={Boolean(errors.athleteId)}
                {...register("athleteId")}
              >
                <NativeSelectOption value="">Pilih atlet binaan…</NativeSelectOption>
                {athletes.map((athlete) => (
                  <NativeSelectOption key={athlete.id} value={athlete.id}>
                    {athlete.fullName}
                    {athlete.groupName ? ` · ${athlete.groupName}` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[errors.athleteId]} />
            </Field>
          )}
          <Field data-invalid={Boolean(errors.evaluationDate)}>
            <FieldLabel htmlFor="evaluationDate">Tanggal evaluasi</FieldLabel>
            <Input
              id="evaluationDate"
              type="date"
              aria-invalid={Boolean(errors.evaluationDate)}
              {...register("evaluationDate")}
            />
            <FieldError errors={[errors.evaluationDate]} />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {TEXT_FIELDS.map((field) => (
            <Field key={field.name} data-invalid={Boolean(errors[field.name])}>
              <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
              <Textarea
                id={field.name}
                rows={4}
                placeholder={field.placeholder}
                aria-invalid={Boolean(errors[field.name])}
                {...register(field.name)}
              />
              <FieldError errors={[errors[field.name]]} />
            </Field>
          ))}
        </div>

        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor="notes">Catatan tambahan (opsional)</FieldLabel>
          <Textarea id="notes" rows={3} {...register("notes")} />
          <FieldDescription>Evaluasi bisa dibaca oleh atlet yang bersangkutan.</FieldDescription>
          <FieldError errors={[errors.notes]} />
        </Field>

        <div className="flex gap-2">
          <Button type="submit" disabled={(evaluationId && !isDirty) || isSubmitting}>
            {isSubmitting ? "Menyimpan…" : evaluationId ? "Simpan perubahan" : "Simpan evaluasi"}
          </Button>
          {!evaluationId && (
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Batal
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
