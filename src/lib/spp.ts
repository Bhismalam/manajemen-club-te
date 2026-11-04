// Aturan SPP (fungsi murni). Bulan ditulis "YYYY-MM" sehingga bisa dibandingkan sebagai string,
// dan bulan berjalan selalu dihitung menurut kalender klub (WITA).

import type { SppPaymentStatus } from "@/generated/prisma/enums";
import { toClubDateInput } from "@/lib/format";

export const SPP_MONTHS_AHEAD = 12;
export const SPP_MAX_AMOUNT = 100_000_000;

export type SppRateRef = { month: string; amount: number };
export type SppDisplayStatus = "PAID" | "PENDING" | "UNPAID";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthFormat = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function isValidMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

export function monthToDate(month: string): Date {
  return new Date(`${month}-01T00:00:00Z`);
}

// Dari kolom @db.Date (dibaca sebagai tanggal UTC, lihat src/lib/format.ts).
export function dateToMonth(value: Date): string {
  return value.toISOString().slice(0, 7);
}

export function currentClubMonth(now: Date = new Date()): string {
  return toClubDateInput(now).slice(0, 7);
}

export function addMonths(month: string, count: number): string {
  const date = monthToDate(month);
  date.setUTCMonth(date.getUTCMonth() + count);
  return dateToMonth(date);
}

export function formatMonth(month: string): string {
  return monthFormat.format(monthToDate(month));
}

// Semua bulan dari `from` sampai `to` (termasuk keduanya), urut naik.
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let month = from; month <= to; month = addMonths(month, 1)) months.push(month);
  return months;
}

// Tagihan mulai dari yang lebih akhir antara bulan bergabung dan bulan tarif pertama.
export function billingStartMonth(joinDate: Date, firstRateMonth: string): string {
  const joinMonth = dateToMonth(joinDate);
  return joinMonth > firstRateMonth ? joinMonth : firstRateMonth;
}

export function firstRateMonth(rates: SppRateRef[]): string | null {
  return rates.reduce<string | null>(
    (first, rate) => (first === null || rate.month < first ? rate.month : first),
    null,
  );
}

// Tarif yang berlaku: baris terbaru yang sudah efektif pada bulan tersebut.
export function rateForMonth(rates: SppRateRef[], month: string): number | null {
  let match: SppRateRef | null = null;
  for (const rate of rates) {
    if (rate.month <= month && (match === null || rate.month > match.month)) match = rate;
  }
  return match?.amount ?? null;
}

// Ditolak/dibatalkan sama dengan belum ada pembayaran.
export function displayStatus(status: SppPaymentStatus | null | undefined): SppDisplayStatus {
  return status === "PAID" || status === "PENDING" ? status : "UNPAID";
}

export function isSettled(status: SppPaymentStatus | null | undefined): boolean {
  return displayStatus(status) !== "UNPAID";
}

// Bulan yang sudah lewat tanpa status Lunas/Menunggu. Bulan berjalan belum dihitung menunggak.
export function arrearsMonths(input: {
  joinDate: Date;
  firstRateMonth: string | null;
  currentMonth: string;
  settledMonths: Iterable<string>;
}): string[] {
  if (input.firstRateMonth === null) return [];
  const settled = new Set(input.settledMonths);
  const start = billingStartMonth(input.joinDate, input.firstRateMonth);
  return monthsBetween(start, addMonths(input.currentMonth, -1)).filter((m) => !settled.has(m));
}

// null = boleh; selain itu pesan kesalahan untuk ditampilkan.
export function periodProblem(input: {
  month: string;
  joinDate: Date;
  firstRateMonth: string;
  currentMonth: string;
}): string | null {
  const start = billingStartMonth(input.joinDate, input.firstRateMonth);
  if (input.month < start) return `Tagihan atlet ini baru dimulai ${formatMonth(start)}.`;
  if (input.month > addMonths(input.currentMonth, SPP_MONTHS_AHEAD)) {
    return `Pembayaran di muka maksimal ${SPP_MONTHS_AHEAD} bulan.`;
  }
  return null;
}
