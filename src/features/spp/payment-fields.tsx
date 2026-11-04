import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { SPP_METHOD_LABEL } from "@/constants/labels";
import { PROOF_ACCEPT } from "@/lib/storage/payment-proof";
import type { SppPaymentFormInput } from "@/lib/validations/spp";

const METHODS = ["TRANSFER", "CASH"] as const;

// Field pembayaran yang sama untuk pencatatan admin/pelatih dan pengajuan atlet.
export function PaymentFields({
  register,
  errors,
  today,
  proofRequired,
  fileError,
  progress,
}: {
  register: UseFormRegister<SppPaymentFormInput>;
  errors: FieldErrors<SppPaymentFormInput>;
  today: string;
  proofRequired: boolean;
  fileError: string | null;
  progress: number | null;
}) {
  return (
    <FieldGroup>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.amount)}>
          <FieldLabel htmlFor="amount">Nominal (Rp)</FieldLabel>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1000}
            aria-invalid={Boolean(errors.amount)}
            {...register("amount", { valueAsNumber: true })}
          />
          <FieldError errors={[errors.amount]} />
        </Field>
        <Field data-invalid={Boolean(errors.paidOn)}>
          <FieldLabel htmlFor="paidOn">Tanggal bayar</FieldLabel>
          <Input
            id="paidOn"
            type="date"
            max={today}
            aria-invalid={Boolean(errors.paidOn)}
            {...register("paidOn")}
          />
          <FieldError errors={[errors.paidOn]} />
        </Field>
      </div>
      <Field data-invalid={Boolean(errors.method)}>
        <FieldLabel htmlFor="method">Metode</FieldLabel>
        <NativeSelect id="method" className="w-full" {...register("method")}>
          {METHODS.map((method) => (
            <NativeSelectOption key={method} value={method}>
              {SPP_METHOD_LABEL[method]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError errors={[errors.method]} />
      </Field>
      <Field data-invalid={Boolean(fileError)}>
        <FieldLabel htmlFor="proof">
          {proofRequired ? "Bukti bayar" : "Bukti bayar (opsional)"}
        </FieldLabel>
        <Input
          id="proof"
          name="proof"
          type="file"
          accept={PROOF_ACCEPT}
          aria-invalid={Boolean(fileError)}
        />
        <FieldDescription>Foto (JPG, PNG, WebP) atau PDF, maksimal 10 MB.</FieldDescription>
        {fileError && <FieldError>{fileError}</FieldError>}
        {progress !== null && (
          <div className="flex flex-col gap-1" role="status" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {progress === 100 ? "Memeriksa file…" : `Mengunggah… ${progress}%`}
            </p>
          </div>
        )}
      </Field>
      <Field data-invalid={Boolean(errors.note)}>
        <FieldLabel htmlFor="note">Catatan (opsional)</FieldLabel>
        <Textarea id="note" rows={2} {...register("note")} />
        <FieldError errors={[errors.note]} />
      </Field>
    </FieldGroup>
  );
}
