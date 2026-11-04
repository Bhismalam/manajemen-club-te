import { ChevronLeft, ChevronRight, CircleDollarSign, ExternalLink, Wallet } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PaginationLinks } from "@/components/shared/pagination-links";
import { StatCard } from "@/components/shared/stat-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SPP_METHOD_LABEL } from "@/constants/labels";
import { formatDate, formatRupiah } from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import { addMonths, formatMonth, monthsBetween, rateForMonth, SPP_MONTHS_AHEAD } from "@/lib/spp";
import type { SppBoardFilter } from "@/lib/validations/spp";
import { getMonthlyBoard, listPendingPayments, type SppBoardRow } from "@/services/spp-service";
import type { GroupOption } from "@/services/training-group-service";

import { CancelPaymentAction, ReviewPaymentActions } from "./payment-actions";
import { RateForm } from "./rate-form";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { proofHref, SppStatusBadge } from "./spp-status";

const STATUS_OPTIONS = [
  { value: "UNPAID", label: "Belum bayar" },
  { value: "PENDING", label: "Menunggu konfirmasi" },
  { value: "PAID", label: "Lunas" },
];

function ProofLink({ paymentId }: { paymentId: string }) {
  return (
    <a
      href={proofHref(paymentId)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-fit items-center gap-1 rounded-sm text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      Lihat bukti
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

function BoardRow({
  row,
  month,
  expectedAmount,
  today,
}: {
  row: SppBoardRow;
  month: string;
  expectedAmount: number | null;
  today: string;
}) {
  const { payment } = row;
  const paymentRef = payment && {
    id: payment.id,
    month,
    amount: payment.amount,
    athleteName: row.fullName,
  };
  return (
    <li className="flex flex-col gap-3 p-4 md:grid md:grid-cols-[1.5fr_1.5fr_auto] md:items-center">
      <div className="flex flex-col">
        <span className="font-medium">{row.fullName}</span>
        <span className="numeric text-xs text-muted-foreground">
          {row.athleteNumber} · {row.groupName ?? "Tanpa kelompok"}
        </span>
        {row.arrears > 0 && (
          <span className="text-xs text-destructive">Menunggak {row.arrears} bulan</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <SppStatusBadge status={payment?.status} />
        {payment && (
          <span className="numeric text-sm text-muted-foreground">
            {formatRupiah(payment.amount)} · {SPP_METHOD_LABEL[payment.method]} ·{" "}
            {formatDate(payment.paidOn)}
          </span>
        )}
        {payment?.reviewNote && (
          <span className="text-sm text-muted-foreground">Alasan: {payment.reviewNote}</span>
        )}
        {payment?.hasProof && <ProofLink paymentId={payment.id} />}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {payment?.status === "PENDING" && paymentRef && (
          <ReviewPaymentActions payment={paymentRef} />
        )}
        {payment?.status === "PAID" && paymentRef && <CancelPaymentAction payment={paymentRef} />}
        {payment?.status !== "PENDING" && payment?.status !== "PAID" && (
          <RecordPaymentDialog
            athleteId={row.athleteId}
            athleteName={row.fullName}
            month={month}
            expectedAmount={expectedAmount}
            today={today}
          />
        )}
      </div>
    </li>
  );
}

// Papan SPP bulanan (admin & pelatih). Data dibatasi athleteScope di service.
export async function SppBoard({
  actor,
  filter,
  groups,
  basePath,
}: {
  actor: Actor;
  filter: SppBoardFilter;
  groups: GroupOption[];
  basePath: string;
}) {
  const [board, pending] = await Promise.all([
    getMonthlyBoard(actor, filter),
    listPendingPayments(actor),
  ]);
  const { month, currentMonth, rates, summary } = board;
  const isAdmin = actor.role === "ADMIN";
  const currentRate = rateForMonth(rates, currentMonth);
  const isFiltered = Boolean(filter.group || filter.status || filter.q);

  const monthHref = (target: string) => {
    const search = new URLSearchParams({ month: target });
    if (filter.group) search.set("group", filter.group);
    if (filter.status) search.set("status", filter.status);
    if (filter.q) search.set("q", filter.q);
    return `${basePath}?${search.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {isAdmin && (
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold">Tarif SPP</h2>
            <p className="text-sm text-muted-foreground">
              {rates.length === 0
                ? "Atur tarif pertama agar tagihan bulanan mulai berjalan."
                : `Tarif ${formatMonth(currentMonth)}: ${
                    currentRate === null ? "belum berlaku" : formatRupiah(currentRate)
                  }`}
            </p>
          </div>
          <RateForm
            months={monthsBetween(
              addMonths(currentMonth, -24),
              addMonths(currentMonth, SPP_MONTHS_AHEAD),
            )}
            defaultMonth={currentMonth}
            defaultAmount={currentRate}
          />
          {rates.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
              {[...rates].reverse().map((rate) => (
                <li key={rate.month} className="numeric">
                  {formatMonth(rate.month)}: {formatRupiah(rate.amount)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Perlu dikonfirmasi ({pending.length})</h2>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {pending.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {payment.athleteName}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {formatMonth(payment.month)}
                    </span>
                  </span>
                  <span className="numeric text-sm text-muted-foreground">
                    {formatRupiah(payment.amount)} · {SPP_METHOD_LABEL[payment.method]} ·{" "}
                    {formatDate(payment.paidOn)}
                  </span>
                  {payment.note && (
                    <span className="text-sm text-muted-foreground">{payment.note}</span>
                  )}
                  {payment.hasProof && <ProofLink paymentId={payment.id} />}
                </div>
                <ReviewPaymentActions
                  payment={{
                    id: payment.id,
                    month: payment.month,
                    amount: payment.amount,
                    athleteName: payment.athleteName,
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={monthHref(addMonths(month, -1))}
            aria-label="Bulan sebelumnya"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronLeft />
          </Link>
          <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
          <Link
            href={monthHref(addMonths(month, 1))}
            aria-label="Bulan berikutnya"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronRight />
          </Link>
        </div>

        {board.billed ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard label="Lunas" value={summary.paid} icon={Wallet} />
              <StatCard label="Belum bayar" value={summary.unpaid} icon={Wallet} />
              <StatCard label="Menunggu" value={summary.pending} icon={Wallet} />
              <StatCard
                label="Diterima"
                value={formatRupiah(summary.received)}
                icon={CircleDollarSign}
              />
            </div>

            <form
              method="get"
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <input type="hidden" name="month" value={month} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Kelompok</span>
                <NativeSelect name="group" defaultValue={filter.group}>
                  <NativeSelectOption value="">Semua kelompok</NativeSelectOption>
                  {groups.map((group) => (
                    <NativeSelectOption key={group.id} value={group.id}>
                      {group.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Status</span>
                <NativeSelect name="status" defaultValue={filter.status ?? ""}>
                  <NativeSelectOption value="">Semua status</NativeSelectOption>
                  {STATUS_OPTIONS.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Cari atlet</span>
                <Input name="q" defaultValue={filter.q} placeholder="Nama atau nomor" />
              </label>
              <Button type="submit" variant="secondary">
                Terapkan
              </Button>
              {isFiltered && (
                <Link
                  href={`${basePath}?month=${month}`}
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Reset
                </Link>
              )}
            </form>

            {board.rows.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title={isFiltered ? "Tidak ada atlet yang cocok" : "Belum ada atlet"}
                description={
                  isFiltered
                    ? "Ubah filter untuk melihat atlet lain."
                    : "Atlet aktif yang sudah bergabung pada bulan ini akan tampil di sini."
                }
              />
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border bg-card">
                {board.rows.map((row) => (
                  <BoardRow
                    key={row.athleteId}
                    row={row}
                    month={month}
                    expectedAmount={board.expectedAmount}
                    today={board.today}
                  />
                ))}
              </ul>
            )}
            <PaginationLinks
              basePath={basePath}
              params={{
                month,
                group: filter.group,
                status: filter.status,
                q: filter.q,
              }}
              page={board.page}
              pageSize={board.pageSize}
              total={board.total}
            />
          </>
        ) : (
          <EmptyState
            icon={Wallet}
            title="Belum ada tagihan bulan ini"
            description={
              isAdmin
                ? "Tagihan dimulai dari bulan tarif pertama. Atur tarif di atas."
                : "Tagihan dimulai setelah admin mengatur tarif SPP."
            }
          />
        )}
      </section>
    </div>
  );
}
