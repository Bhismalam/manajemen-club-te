"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatMonth } from "@/lib/spp";
import { type SetSppRateInput, setSppRateSchema } from "@/lib/validations/spp";

import { setSppRateAction } from "./spp-actions";

export function RateForm({
  months,
  defaultMonth,
  defaultAmount,
}: {
  months: string[];
  defaultMonth: string;
  defaultAmount: number | null;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetSppRateInput>({
    resolver: zodResolver(setSppRateSchema),
    defaultValues: { month: defaultMonth, amount: defaultAmount ?? undefined },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
      onSubmit={handleSubmit(async (values) => {
        const result = await setSppRateAction(values);
        if (!result.success) {
          const field = result.error.field === "month" ? "month" : "amount";
          setError(field, { message: result.error.message });
          return;
        }
        toast.success(result.message ?? "Tersimpan.");
      })}
    >
      <Field data-invalid={Boolean(errors.amount)} className="sm:max-w-44">
        <FieldLabel htmlFor="rate-amount">Tarif per bulan (Rp)</FieldLabel>
        <Input
          id="rate-amount"
          type="number"
          inputMode="numeric"
          min={1}
          step={1000}
          aria-invalid={Boolean(errors.amount)}
          {...register("amount", { valueAsNumber: true })}
        />
        <FieldError errors={[errors.amount]} />
      </Field>
      <Field data-invalid={Boolean(errors.month)} className="sm:max-w-56">
        <FieldLabel htmlFor="rate-month">Berlaku mulai</FieldLabel>
        <NativeSelect id="rate-month" className="w-full" {...register("month")}>
          {months.map((month) => (
            <NativeSelectOption key={month} value={month}>
              {formatMonth(month)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>Bulan sebelum tarif pertama tidak ditagih.</FieldDescription>
        <FieldError errors={[errors.month]} />
      </Field>
      <Button type="submit" variant="secondary" disabled={isSubmitting} className="sm:mt-6">
        {isSubmitting ? "Menyimpan…" : "Simpan tarif"}
      </Button>
    </form>
  );
}
