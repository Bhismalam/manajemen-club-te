import { ExternalLink, Wallet } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { SPP_METHOD_LABEL } from "@/constants/labels";
import { formatDate, formatRupiah } from "@/lib/format";
import { formatMonth } from "@/lib/spp";
import type { SppHistory } from "@/services/spp-service";

import { proofHref, SppStatusBadge } from "./spp-status";

// Riwayat SPP per bulan untuk halaman atlet dan detail atlet admin/pelatih.
export function AthleteSppHistory({
  history,
  limit,
  emptyDescription,
}: {
  history: SppHistory;
  limit?: number;
  emptyDescription: string;
}) {
  const rows = limit ? history.rows.slice(0, limit) : history.rows;
  if (rows.length === 0) {
    return <EmptyState icon={Wallet} title="Belum ada tagihan" description={emptyDescription} />;
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {rows.map(({ month, expectedAmount, payment }) => (
        <li key={month} className="flex flex-col gap-1.5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{formatMonth(month)}</span>
            <SppStatusBadge status={payment?.status} />
          </div>
          <p className="numeric text-sm text-muted-foreground">
            {payment
              ? `${formatRupiah(payment.amount)} · ${SPP_METHOD_LABEL[payment.method]} · ${formatDate(payment.paidOn)}`
              : expectedAmount !== null
                ? `Tagihan ${formatRupiah(expectedAmount)}`
                : "—"}
          </p>
          {payment?.note && <p className="text-sm text-muted-foreground">{payment.note}</p>}
          {payment?.reviewNote && (
            <p className="text-sm">
              <span className="font-medium">Alasan:</span> {payment.reviewNote}
            </p>
          )}
          {payment?.hasProof && (
            <a
              href={proofHref(payment.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-1 rounded-sm text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Lihat bukti
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
