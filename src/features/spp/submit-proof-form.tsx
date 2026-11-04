"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatMonth } from "@/lib/spp";
import { type SppPaymentFormInput, sppPaymentFormSchema } from "@/lib/validations/spp";

import { PaymentFields } from "./payment-fields";
import { proofFileFrom, uploadProof } from "./proof-upload";
import { requestMyProofUploadAction, submitMySppPaymentAction } from "./spp-actions";

const FORM_FIELDS = ["month", "amount", "method", "paidOn", "note"] as const;

// Atlet mengajukan bukti untuk dirinya sendiri; athleteId ditentukan server dari session.
export function SubmitProofForm({
  months,
  defaultMonth,
  today,
}: {
  months: { month: string; amount: number; pending: boolean }[];
  defaultMonth: string;
  today: string;
}) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const amountOf = (month: string) => months.find((m) => m.month === month)?.amount;
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SppPaymentFormInput>({
    resolver: zodResolver(sppPaymentFormSchema),
    defaultValues: {
      month: defaultMonth,
      amount: amountOf(defaultMonth),
      method: "TRANSFER",
      paidOn: today,
      note: "",
    },
  });

  async function save(values: SppPaymentFormInput, file: File | undefined) {
    setFileError(null);
    if (!file) {
      setFileError("Lampirkan bukti pembayaran.");
      return;
    }
    try {
      setProgress(0);
      const upload = await uploadProof(
        file,
        (meta) => requestMyProofUploadAction({ ...meta, month: values.month }),
        setProgress,
      );
      if (!upload.ok) {
        setFileError(upload.message);
        return;
      }

      const result = await submitMySppPaymentAction({
        ...values,
        proofKey: upload.key,
        proofName: file.name,
      });
      if (!result.success) {
        const field = FORM_FIELDS.find((name) => name === result.error.field);
        if (field) setError(field, { message: result.error.message });
        else if (result.error.field === "file") setFileError(result.error.message);
        else toast.error(result.error.message);
        return;
      }
      toast.success(result.message ?? "Terkirim.");
      reset();
    } catch {
      toast.error("Terjadi kesalahan di server. Coba lagi.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <form
      noValidate
      className="flex max-w-xl flex-col gap-5"
      onSubmit={(event) => {
        const file = proofFileFrom(event.currentTarget);
        void handleSubmit((values) => save(values, file))(event);
      }}
    >
      <Field data-invalid={Boolean(errors.month)}>
        <FieldLabel htmlFor="month">Bulan</FieldLabel>
        <NativeSelect
          id="month"
          className="w-full"
          {...register("month", {
            onChange: (event) => {
              const amount = amountOf(event.target.value);
              if (amount !== undefined) setValue("amount", amount);
            },
          })}
        >
          {months.map(({ month, pending }) => (
            <NativeSelectOption key={month} value={month}>
              {formatMonth(month)}
              {pending ? " (ganti pengajuan)" : ""}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError errors={[errors.month]} />
      </Field>
      <PaymentFields
        register={register}
        errors={errors}
        today={today}
        proofRequired
        fileError={fileError}
        progress={progress}
      />
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Mengirim…" : "Kirim bukti"}
      </Button>
    </form>
  );
}
