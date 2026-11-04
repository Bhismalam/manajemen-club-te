"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/lib/format";
import { formatMonth } from "@/lib/spp";

import {
  approveSppPaymentAction,
  cancelSppPaymentAction,
  rejectSppPaymentAction,
} from "./spp-actions";

type PaymentRef = { id: string; month: string; amount: number; athleteName: string };

type ActionOutcome =
  { success: true; message?: string } | { success: false; error: { message: string } };

function report(result: ActionOutcome) {
  if (!result.success) {
    toast.error(result.error.message);
    return false;
  }
  toast.success(result.message ?? "Tersimpan.");
  return true;
}

function describe(payment: PaymentRef) {
  return `${payment.athleteName} · ${formatMonth(payment.month)} · ${formatRupiah(payment.amount)}`;
}

// Alasan wajib: ditampilkan ke atlet dan tercatat di audit log.
function ReasonDialog({
  open,
  onOpenChange,
  title,
  payment,
  confirmLabel,
  pendingLabel,
  submit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  payment: PaymentRef;
  confirmLabel: string;
  pendingLabel: string;
  submit: (note: string) => Promise<ActionOutcome>;
}) {
  const [note, setNote] = useState("");
  const id = `reason-${payment.id}-${confirmLabel}`;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={describe(payment)}
      confirmLabel={confirmLabel}
      pendingLabel={pendingLabel}
      destructive
      disabled={note.trim().length < 3}
      onConfirm={async () => {
        const success = report(await submit(note));
        if (success) setNote("");
        return success;
      }}
    >
      <Field>
        <FieldLabel htmlFor={id}>Alasan</FieldLabel>
        <Textarea
          id={id}
          rows={2}
          maxLength={300}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}

export function ReviewPaymentActions({ payment }: { payment: PaymentRef }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setApproving(true)}>
        Setujui
      </Button>
      <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
        Tolak
      </Button>
      <ConfirmDialog
        open={approving}
        onOpenChange={setApproving}
        title="Setujui pembayaran ini?"
        description={describe(payment)}
        confirmLabel="Setujui"
        pendingLabel="Menyimpan…"
        onConfirm={async () => report(await approveSppPaymentAction({ paymentId: payment.id }))}
      />
      <ReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Tolak pengajuan ini?"
        payment={payment}
        confirmLabel="Tolak"
        pendingLabel="Menolak…"
        submit={(note) => rejectSppPaymentAction({ paymentId: payment.id, note })}
      />
    </div>
  );
}

export function CancelPaymentAction({ payment }: { payment: PaymentRef }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Batalkan
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Batalkan status lunas?"
        payment={payment}
        confirmLabel="Batalkan lunas"
        pendingLabel="Membatalkan…"
        submit={(note) => cancelSppPaymentAction({ paymentId: payment.id, note })}
      />
    </>
  );
}
