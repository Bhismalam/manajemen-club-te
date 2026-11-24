"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMonth } from "@/lib/spp";
import { type SppPaymentFormInput, sppPaymentFormSchema } from "@/lib/validations/spp";

import { PaymentFields } from "./payment-fields";
import { proofFileFrom, uploadProof } from "./proof-upload";
import { recordSppPaymentAction, requestProofUploadAction } from "./spp-actions";

const FORM_FIELDS = ["amount", "method", "paidOn", "note"] as const;

// Admin/pelatih mencatat pembayaran tunai atau transfer sebagai lunas; bukti opsional.
export function RecordPaymentDialog({
  athleteId,
  athleteName,
  month,
  expectedAmount,
  today,
}: {
  athleteId: string;
  athleteName: string;
  month: string;
  expectedAmount: number | null;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  // Tarif bisa berubah setelah komponen dipasang (refresh), jadi nilai awal diisi ulang saat dibuka.
  const defaults: Partial<SppPaymentFormInput> = {
    month,
    amount: expectedAmount ?? undefined,
    method: "CASH",
    paidOn: today,
    note: "",
  };
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SppPaymentFormInput>({
    resolver: zodResolver(sppPaymentFormSchema),
    defaultValues: defaults,
  });

  async function save(values: SppPaymentFormInput, file: File | undefined) {
    setFileError(null);
    try {
      let proof: { proofKey: string; proofName: string } | null = null;
      if (file) {
        setProgress(0);
        const upload = await uploadProof(
          file,
          (meta) => requestProofUploadAction({ ...meta, athleteId, month }),
          setProgress,
        );
        if (!upload.ok) {
          setFileError(upload.message);
          return;
        }
        proof = { proofKey: upload.key, proofName: file.name };
      }

      const result = await recordSppPaymentAction({ ...values, athleteId, ...proof });
      if (!result.success) {
        const field = FORM_FIELDS.find((name) => name === result.error.field);
        if (field) setError(field, { message: result.error.message });
        else if (result.error.field === "file") setFileError(result.error.message);
        else toast.error(result.error.message);
        return;
      }
      toast.success(result.message ?? "Tersimpan.");
      setOpen(false);
    } catch {
      toast.error("Terjadi kesalahan di server. Coba lagi.");
    } finally {
      setProgress(null);
    }
  }

  function openDialog() {
    reset(defaults);
    setFileError(null);
    setOpen(true);
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={openDialog}>
        Catat lunas
      </Button>
      <Dialog open={open} onOpenChange={(next) => !isSubmitting && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Catat SPP lunas</DialogTitle>
            <DialogDescription>
              {athleteName} · {formatMonth(month)}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              const file = proofFileFrom(event.currentTarget);
              void handleSubmit((values) => save(values, file))(event);
            }}
          >
            <PaymentFields
              register={register}
              errors={errors}
              today={today}
              proofRequired={false}
              fileError={fileError}
              progress={progress}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
