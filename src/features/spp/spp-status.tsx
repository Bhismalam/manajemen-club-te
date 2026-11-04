import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { SPP_STATUS_LABEL } from "@/constants/labels";
import type { SppPaymentStatus } from "@/generated/prisma/enums";

const TONE: Record<SppPaymentStatus, StatusTone> = {
  PAID: "success",
  PENDING: "warning",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

// `null` = belum ada catatan pembayaran untuk bulan tersebut.
export function SppStatusBadge({ status }: { status: SppPaymentStatus | null | undefined }) {
  if (!status) return <StatusBadge tone="neutral">Belum bayar</StatusBadge>;
  return <StatusBadge tone={TONE[status]}>{SPP_STATUS_LABEL[status]}</StatusBadge>;
}

export function proofHref(paymentId: string) {
  return `/api/spp/payments/${paymentId}/proof`;
}
