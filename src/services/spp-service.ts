import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { SppPaymentMethod, SppPaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { formatRupiah, toClubDateInput } from "@/lib/format";
import { requireAthleteAccess } from "@/lib/permissions/guards";
import { canManageAthletePayment, canSetSppRate } from "@/lib/permissions/policies";
import { athleteScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import {
  addMonths,
  arrearsMonths,
  billingStartMonth,
  currentClubMonth,
  dateToMonth,
  displayStatus,
  firstRateMonth,
  formatMonth,
  isSettled,
  monthsBetween,
  monthToDate,
  periodProblem,
  rateForMonth,
  SPP_MONTHS_AHEAD,
  type SppRateRef,
} from "@/lib/spp";
import {
  checkProofFile,
  detectProofType,
  isProofKeyOf,
  PROOF_MAX_BYTES,
  proofKeyFor,
} from "@/lib/storage/payment-proof";
import { sanitizeFileName } from "@/lib/storage/pdf";
import { paymentProofs } from "@/lib/storage/supabase";
import { dateOnly, emptyToNull } from "@/lib/validations/common";
import type {
  RecordSppPaymentInput,
  SetSppRateInput,
  SppBoardFilter,
  SubmitSppPaymentInput,
} from "@/lib/validations/spp";
import { writeAuditLog } from "@/services/audit-log-service";
import { notifyAdmins } from "@/services/notification-service";

// Pencatatan SPP bulanan (doc/PRD.md §4.14). Pembayaran terjadi di luar aplikasi;
// aplikasi hanya mencatat status, nominal, dan bukti.

export const SPP_PAGE_SIZE = 25;
export const SPP_ADMIN_PATH = "/admin/spp";
export const PROOF_URL_TTL_SECONDS = 300;

const SETTLED_STATUSES: SppPaymentStatus[] = ["PAID", "PENDING"];

const paymentSelect = {
  id: true,
  period: true,
  status: true,
  amount: true,
  method: true,
  paidOn: true,
  note: true,
  proofKey: true,
  proofName: true,
  reviewNote: true,
} as const;

type PaymentRow = Prisma.SppPaymentGetPayload<{ select: typeof paymentSelect }>;

// Object key tidak pernah dikirim ke browser; bukti dibuka lewat route yang memeriksa izin.
function toPaymentView({ proofKey, period, ...payment }: PaymentRow) {
  return { ...payment, month: dateToMonth(period), hasProof: proofKey !== null };
}
export type SppPaymentView = ReturnType<typeof toPaymentView>;

async function loadRates(): Promise<SppRateRef[]> {
  const rates = await prisma.sppRate.findMany({
    orderBy: { effectiveMonth: "asc" },
    select: { amount: true, effectiveMonth: true },
  });
  return rates.map((rate) => ({ month: dateToMonth(rate.effectiveMonth), amount: rate.amount }));
}

// ---------------------------------------------------------------------------
// Tarif
// ---------------------------------------------------------------------------

export async function setRate(actor: Actor, input: SetSppRateInput, now = new Date()) {
  if (!canSetSppRate(actor))
    throw new AppError("FORBIDDEN", "Hanya admin yang bisa mengatur tarif.");
  if (input.month > addMonths(currentClubMonth(now), SPP_MONTHS_AHEAD)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Tarif bisa dijadwalkan maksimal ${SPP_MONTHS_AHEAD} bulan ke depan.`,
      "month",
    );
  }

  const effectiveMonth = monthToDate(input.month);
  await prisma.$transaction(async (tx) => {
    const previous = await tx.sppRate.findUnique({ where: { effectiveMonth } });
    const rate = await tx.sppRate.upsert({
      where: { effectiveMonth },
      update: { amount: input.amount, createdById: actor.userId },
      create: { effectiveMonth, amount: input.amount, createdById: actor.userId },
    });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "spp_rate.set",
      entityType: "SppRate",
      entityId: rate.id,
      metadata: { month: input.month, amount: input.amount, previousAmount: previous?.amount },
    });
  });
}

// ---------------------------------------------------------------------------
// Papan bulanan (admin & pelatih)
// ---------------------------------------------------------------------------

function billableAthletesWhere(
  actor: Actor,
  month: string,
  group: string,
): Prisma.AthleteProfileWhereInput {
  return {
    AND: [
      athleteScope(actor),
      { isActive: true, joinDate: { lt: monthToDate(addMonths(month, 1)) } },
      group ? { trainingGroupId: group } : {},
    ],
  };
}

function hasPayment(period: Date, status: SppPaymentStatus): Prisma.AthleteProfileWhereInput {
  return { sppPayments: { some: { period, status } } };
}

function statusWhere(
  period: Date,
  status: SppBoardFilter["status"],
): Prisma.AthleteProfileWhereInput {
  if (status === "PAID" || status === "PENDING") return hasPayment(period, status);
  if (status === "UNPAID") {
    return { sppPayments: { none: { period, status: { in: SETTLED_STATUSES } } } };
  }
  return {};
}

async function monthSummary(actor: Actor, month: string, group: string) {
  const period = monthToDate(month);
  const base = billableAthletesWhere(actor, month, group);
  const [billable, paid, pending, received] = await Promise.all([
    prisma.athleteProfile.count({ where: base }),
    prisma.athleteProfile.count({ where: { AND: [base, hasPayment(period, "PAID")] } }),
    prisma.athleteProfile.count({ where: { AND: [base, hasPayment(period, "PENDING")] } }),
    // Termasuk atlet yang kini nonaktif: uangnya tetap sudah diterima.
    prisma.sppPayment.aggregate({
      _sum: { amount: true },
      where: {
        period,
        status: "PAID",
        athlete: { AND: [athleteScope(actor), group ? { trainingGroupId: group } : {}] },
      },
    }),
  ]);
  return { paid, pending, unpaid: billable - paid - pending, received: received._sum.amount ?? 0 };
}

export async function getMonthlyBoard(actor: Actor, filter: SppBoardFilter, now = new Date()) {
  const currentMonth = currentClubMonth(now);
  const month = filter.month ?? currentMonth;
  const rates = await loadRates();
  const firstMonth = firstRateMonth(rates);
  const expectedAmount = rateForMonth(rates, month);
  const today = toClubDateInput(now);

  // Sebelum tarif pertama belum ada tagihan sama sekali.
  if (firstMonth === null || month < firstMonth) {
    return {
      month,
      currentMonth,
      today,
      rates,
      expectedAmount,
      billed: false,
      summary: { paid: 0, pending: 0, unpaid: 0, received: 0 },
      rows: [],
      total: 0,
      page: filter.page,
      pageSize: SPP_PAGE_SIZE,
    };
  }

  const period = monthToDate(month);
  const where: Prisma.AthleteProfileWhereInput = {
    AND: [
      billableAthletesWhere(actor, month, filter.group),
      statusWhere(period, filter.status),
      filter.q
        ? {
            OR: [
              { fullName: { contains: filter.q, mode: "insensitive" } },
              { athleteNumber: { contains: filter.q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [summary, total, athletes] = await Promise.all([
    monthSummary(actor, month, filter.group),
    prisma.athleteProfile.count({ where }),
    prisma.athleteProfile.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (filter.page - 1) * SPP_PAGE_SIZE,
      take: SPP_PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        athleteNumber: true,
        joinDate: true,
        trainingGroup: { select: { name: true } },
        sppPayments: { where: { period }, select: paymentSelect },
      },
    }),
  ]);

  const settled = await prisma.sppPayment.findMany({
    where: { athleteId: { in: athletes.map((a) => a.id) }, status: { in: SETTLED_STATUSES } },
    select: { athleteId: true, period: true },
  });

  const rows = athletes.map((athlete) => {
    const payment = athlete.sppPayments[0];
    return {
      athleteId: athlete.id,
      fullName: athlete.fullName,
      athleteNumber: athlete.athleteNumber,
      groupName: athlete.trainingGroup?.name ?? null,
      payment: payment ? toPaymentView(payment) : null,
      arrears: arrearsMonths({
        joinDate: athlete.joinDate,
        firstRateMonth: firstMonth,
        currentMonth,
        settledMonths: settled
          .filter((s) => s.athleteId === athlete.id)
          .map((s) => dateToMonth(s.period)),
      }).length,
    };
  });

  return {
    month,
    currentMonth,
    today,
    rates,
    expectedAmount,
    billed: true,
    summary,
    rows,
    total,
    page: filter.page,
    pageSize: SPP_PAGE_SIZE,
  };
}
export type SppBoardRow = Awaited<ReturnType<typeof getMonthlyBoard>>["rows"][number];

// Pengajuan atlet yang menunggu konfirmasi, dari bulan mana pun.
export async function listPendingPayments(actor: Actor) {
  if (actor.role === "ATHLETE") return [];
  const payments = await prisma.sppPayment.findMany({
    where: { status: "PENDING", athlete: athleteScope(actor) },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      ...paymentSelect,
      athlete: { select: { fullName: true, trainingGroup: { select: { name: true } } } },
    },
  });
  return payments.map(({ athlete, ...payment }) => ({
    ...toPaymentView(payment),
    athleteName: athlete.fullName,
    groupName: athlete.trainingGroup?.name ?? null,
  }));
}

// Ringkasan bulan berjalan untuk dashboard admin & pelatih.
export async function getSppOverview(actor: Actor, now = new Date()) {
  const month = currentClubMonth(now);
  const rates = await loadRates();
  const firstMonth = firstRateMonth(rates);
  const configured = firstMonth !== null && month >= firstMonth;
  const [summary, waiting] = await Promise.all([
    configured ? monthSummary(actor, month, "") : null,
    prisma.sppPayment.count({ where: { status: "PENDING", athlete: athleteScope(actor) } }),
  ]);
  return { month, configured, unpaid: summary?.unpaid ?? 0, paid: summary?.paid ?? 0, waiting };
}

// ---------------------------------------------------------------------------
// Riwayat satu atlet
// ---------------------------------------------------------------------------

export async function getAthleteSppHistory(actor: Actor, athleteId: string, now = new Date()) {
  await requireAthleteAccess(actor, athleteId, "view");
  const [athlete, rates, payments] = await Promise.all([
    prisma.athleteProfile.findUniqueOrThrow({
      where: { id: athleteId },
      select: { joinDate: true, isActive: true },
    }),
    loadRates(),
    prisma.sppPayment.findMany({ where: { athleteId }, select: paymentSelect }),
  ]);

  const currentMonth = currentClubMonth(now);
  const firstMonth = firstRateMonth(rates);
  const byMonth = new Map(payments.map((p) => [dateToMonth(p.period), toPaymentView(p)]));
  const settledMonths = [...byMonth.values()]
    .filter((p) => isSettled(p.status))
    .map((p) => p.month);

  const billedMonths =
    firstMonth !== null && athlete.isActive
      ? monthsBetween(billingStartMonth(athlete.joinDate, firstMonth), currentMonth)
      : [];
  const rows = [...new Set([...billedMonths, ...byMonth.keys()])]
    .sort((a, b) => b.localeCompare(a))
    .map((month) => {
      const payment = byMonth.get(month) ?? null;
      return {
        month,
        expectedAmount: rateForMonth(rates, month),
        payment,
        status: displayStatus(payment?.status),
      };
    });

  // Bulan yang masih bisa diajukan: tunggakan, bulan berjalan, dan pembayaran di muka.
  const payableMonths =
    firstMonth !== null && athlete.isActive
      ? monthsBetween(
          billingStartMonth(athlete.joinDate, firstMonth),
          addMonths(currentMonth, SPP_MONTHS_AHEAD),
        )
          .filter((month) => byMonth.get(month)?.status !== "PAID")
          .map((month) => ({
            month,
            amount: rateForMonth(rates, month) ?? 0,
            pending: byMonth.get(month)?.status === "PENDING",
          }))
      : [];

  return {
    configured: firstMonth !== null,
    currentMonth,
    today: toClubDateInput(now),
    current: rows.find((row) => row.month === currentMonth) ?? null,
    arrears: athlete.isActive
      ? arrearsMonths({
          joinDate: athlete.joinDate,
          firstRateMonth: firstMonth,
          currentMonth,
          settledMonths,
        })
      : [],
    rows,
    payableMonths,
  };
}
export type SppHistory = Awaited<ReturnType<typeof getAthleteSppHistory>>;

// ---------------------------------------------------------------------------
// Bukti pembayaran
// ---------------------------------------------------------------------------

async function removeProofObjects(keys: string[]) {
  const { error } = await paymentProofs().remove(keys);
  // Gagal hapus tidak menggagalkan aksi user; objek yatim bisa dibersihkan belakangan.
  if (error) console.error("Gagal menghapus bukti pembayaran", keys, error.message);
}

// Atlet hanya untuk dirinya sendiri; admin & pelatih sesuai kebijakan pengelolaan.
async function requirePaymentAthlete(actor: Actor, athleteId: string) {
  const ref = await requireAthleteAccess(actor, athleteId, "view");
  if (actor.role !== "ATHLETE" && !canManageAthletePayment(actor, ref)) {
    throw new AppError("FORBIDDEN", "Kamu tidak punya akses ke data atlet ini.");
  }
  return prisma.athleteProfile.findUniqueOrThrow({
    where: { id: athleteId },
    select: { id: true, fullName: true, joinDate: true },
  });
}

async function assertPayableMonth(joinDate: Date, month: string, now: Date) {
  const first = firstRateMonth(await loadRates());
  if (first === null) throw new AppError("CONFLICT", "Tarif SPP belum diatur oleh admin.");
  const problem = periodProblem({
    month,
    joinDate,
    firstRateMonth: first,
    currentMonth: currentClubMonth(now),
  });
  if (problem) throw new AppError("VALIDATION_ERROR", problem, "month");
}

export async function requestProofUpload(
  actor: Actor,
  input: { athleteId: string; month: string; size: number; type: string },
  now = new Date(),
) {
  const athlete = await requirePaymentAthlete(actor, input.athleteId);
  await assertPayableMonth(athlete.joinDate, input.month, now);
  const check = checkProofFile(input);
  if (!check.ok) throw new AppError("VALIDATION_ERROR", check.message, "file");

  const key = proofKeyFor(athlete.id, input.month, check.extension);
  const { data, error } = await paymentProofs().createSignedUploadUrl(key);
  if (error) throw new Error(`createSignedUploadUrl gagal: ${error.message}`);
  return { key, signedUrl: data.signedUrl };
}

// Server memeriksa isi file yang sudah terunggah sebelum menyimpannya ke pembayaran.
async function verifyProof(athleteId: string, month: string, key: string) {
  if (!isProofKeyOf(key, athleteId, month)) {
    throw new AppError("VALIDATION_ERROR", "Upload tidak dikenali. Coba unggah ulang.", "file");
  }
  const { data: blob, error } = await paymentProofs().download(key);
  if (error) {
    throw new AppError("VALIDATION_ERROR", "File belum terunggah. Coba unggah ulang.", "file");
  }
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (blob.size > PROOF_MAX_BYTES || detectProofType(head) === null) {
    await removeProofObjects([key]);
    throw new AppError("VALIDATION_ERROR", "Isi file bukan foto atau PDF yang valid.", "file");
  }
}

export async function getProofUrl(actor: Actor, paymentId: string) {
  const payment = await prisma.sppPayment.findFirst({
    where: { AND: [{ id: paymentId }, { athlete: athleteScope(actor) }] },
    select: { proofKey: true },
  });
  if (!payment?.proofKey) throw new AppError("NOT_FOUND", "Bukti pembayaran tidak ditemukan.");

  const { data, error } = await paymentProofs().createSignedUrl(
    payment.proofKey,
    PROOF_URL_TTL_SECONDS,
  );
  if (error) throw new Error(`createSignedUrl gagal: ${error.message}`);
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Mencatat & mengajukan
// ---------------------------------------------------------------------------

type PaymentWrite = {
  amount: number;
  status: SppPaymentStatus;
  method: SppPaymentMethod;
  paidOn: Date;
  note: string | null;
  proofKey: string | null;
  proofName: string | null;
  submittedById: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reviewNote: null;
};

function blockedMessage(status: SppPaymentStatus, month: string) {
  return status === "PAID"
    ? `SPP ${formatMonth(month)} sudah lunas.`
    : `SPP ${formatMonth(month)} masih menunggu konfirmasi. Setujui atau tolak dulu.`;
}

// Satu baris per atlet per bulan: baris lama dipakai ulang hanya bila statusnya mengizinkan.
async function writePayment(
  tx: Prisma.TransactionClient,
  athleteId: string,
  month: string,
  data: PaymentWrite,
  replaceable: SppPaymentStatus[],
) {
  const period = monthToDate(month);
  const existing = await tx.sppPayment.findUnique({
    where: { athleteId_period: { athleteId, period } },
    select: { id: true, status: true, proofKey: true },
  });
  if (!existing) {
    const created = await tx.sppPayment.create({ data: { ...data, athleteId, period } });
    return { id: created.id, previous: null };
  }
  if (!replaceable.includes(existing.status)) {
    throw new AppError("CONFLICT", blockedMessage(existing.status, month));
  }
  const { count } = await tx.sppPayment.updateMany({
    where: { id: existing.id, status: { in: replaceable } },
    data,
  });
  if (count === 0) throw new AppError("CONFLICT", "Status pembayaran baru saja berubah.");
  return { id: existing.id, previous: existing };
}

// Dua pencatatan bersamaan pada bulan yang sama berakhir di unique constraint.
function toConflict(error: unknown): unknown {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    ? new AppError("CONFLICT", "Pembayaran bulan ini baru saja dicatat. Muat ulang halaman.")
    : error;
}

function assertPaidOn(paidOn: string, now: Date) {
  if (paidOn > toClubDateInput(now)) {
    throw new AppError("VALIDATION_ERROR", "Tanggal bayar tidak boleh di masa depan.", "paidOn");
  }
}

async function dropReplacedProof(previousKey: string | null | undefined, newKey: string | null) {
  if (previousKey && previousKey !== newKey) await removeProofObjects([previousKey]);
}

export async function recordPayment(actor: Actor, input: RecordSppPaymentInput, now = new Date()) {
  if (actor.role === "ATHLETE") {
    throw new AppError("FORBIDDEN", "Atlet hanya bisa mengajukan bukti pembayaran.");
  }
  const athlete = await requirePaymentAthlete(actor, input.athleteId);
  await assertPayableMonth(athlete.joinDate, input.month, now);
  assertPaidOn(input.paidOn, now);
  if (input.proofKey) await verifyProof(athlete.id, input.month, input.proofKey);

  const proofKey = input.proofKey ?? null;
  try {
    const { previous } = await prisma.$transaction(async (tx) => {
      const result = await writePayment(
        tx,
        athlete.id,
        input.month,
        {
          amount: input.amount,
          status: "PAID",
          method: input.method,
          paidOn: dateOnly(input.paidOn),
          note: emptyToNull(input.note),
          proofKey,
          proofName: proofKey ? sanitizeFileName(input.proofName ?? "", "bukti") : null,
          submittedById: actor.userId,
          reviewedById: actor.userId,
          reviewedAt: now,
          reviewNote: null,
        },
        ["REJECTED", "CANCELLED"],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.userId,
        action: "spp_payment.recorded",
        entityType: "SppPayment",
        entityId: result.id,
        metadata: {
          athleteId: athlete.id,
          month: input.month,
          amount: input.amount,
          method: input.method,
          hasProof: proofKey !== null,
          previousStatus: result.previous?.status,
        },
      });
      return result;
    });
    await dropReplacedProof(previous?.proofKey, proofKey);
  } catch (error) {
    throw toConflict(error);
  }
}

// athleteId selalu dari session, tidak pernah dari form.
export async function submitPayment(actor: Actor, input: SubmitSppPaymentInput, now = new Date()) {
  if (actor.role !== "ATHLETE" || !actor.athleteId) {
    throw new AppError("FORBIDDEN", "Hanya atlet yang bisa mengajukan bukti pembayaran.");
  }
  const athlete = await requirePaymentAthlete(actor, actor.athleteId);
  await assertPayableMonth(athlete.joinDate, input.month, now);
  assertPaidOn(input.paidOn, now);
  await verifyProof(athlete.id, input.month, input.proofKey);

  try {
    const { previous } = await prisma.$transaction(async (tx) => {
      const result = await writePayment(
        tx,
        athlete.id,
        input.month,
        {
          amount: input.amount,
          status: "PENDING",
          method: input.method,
          paidOn: dateOnly(input.paidOn),
          note: emptyToNull(input.note),
          proofKey: input.proofKey,
          proofName: sanitizeFileName(input.proofName, "bukti"),
          submittedById: actor.userId,
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
        },
        // Atlet boleh mengganti pengajuannya sendiri, tapi tidak pernah menimpa status Lunas.
        ["PENDING", "REJECTED", "CANCELLED"],
      );
      await writeAuditLog(tx, {
        actorUserId: actor.userId,
        action: "spp_payment.submitted",
        entityType: "SppPayment",
        entityId: result.id,
        metadata: {
          athleteId: athlete.id,
          month: input.month,
          amount: input.amount,
          previousStatus: result.previous?.status,
        },
      });
      await notifyAdmins(tx, actor.userId, {
        type: "SPP_SUBMITTED",
        title: "Bukti SPP baru",
        message: `${athlete.fullName} mengajukan SPP ${formatMonth(input.month)} sebesar ${formatRupiah(input.amount)}.`,
        linkUrl: SPP_ADMIN_PATH,
      });
      return result;
    });
    await dropReplacedProof(previous?.proofKey, input.proofKey);
  } catch (error) {
    throw toConflict(error);
  }
}

// ---------------------------------------------------------------------------
// Konfirmasi
// ---------------------------------------------------------------------------

async function findManageablePayment(actor: Actor, paymentId: string) {
  const payment = await prisma.sppPayment.findFirst({
    where: { AND: [{ id: paymentId }, { athlete: athleteScope(actor) }] },
    select: {
      id: true,
      athleteId: true,
      period: true,
      status: true,
      amount: true,
      athlete: { select: { trainingGroup: { select: { coachId: true } } } },
    },
  });
  if (!payment) throw new AppError("NOT_FOUND", "Pembayaran tidak ditemukan.");
  const coachId = payment.athlete.trainingGroup?.coachId ?? null;
  if (!canManageAthletePayment(actor, { coachId })) {
    throw new AppError("FORBIDDEN", "Kamu tidak boleh mengubah pembayaran ini.");
  }
  return payment;
}

// Perubahan status atomik: aksi ganda atau perubahan bersamaan ditolak, bukan ditimpa.
async function transitionPayment(
  actor: Actor,
  paymentId: string,
  change: {
    from: SppPaymentStatus;
    to: SppPaymentStatus;
    note: string | null;
    action: string;
    staleMessage: string;
  },
  now: Date,
) {
  const payment = await findManageablePayment(actor, paymentId);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.sppPayment.updateMany({
      where: { id: payment.id, status: change.from },
      data: {
        status: change.to,
        reviewNote: change.note,
        reviewedById: actor.userId,
        reviewedAt: now,
      },
    });
    if (count === 0) throw new AppError("CONFLICT", change.staleMessage);
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: change.action,
      entityType: "SppPayment",
      entityId: payment.id,
      metadata: {
        athleteId: payment.athleteId,
        month: dateToMonth(payment.period),
        amount: payment.amount,
        note: change.note,
      },
    });
  });
}

const NO_LONGER_PENDING = "Pengajuan ini sudah diproses. Muat ulang halaman.";

export function approvePayment(actor: Actor, paymentId: string, now = new Date()) {
  return transitionPayment(
    actor,
    paymentId,
    {
      from: "PENDING",
      to: "PAID",
      note: null,
      action: "spp_payment.approved",
      staleMessage: NO_LONGER_PENDING,
    },
    now,
  );
}

export function rejectPayment(actor: Actor, paymentId: string, note: string, now = new Date()) {
  return transitionPayment(
    actor,
    paymentId,
    {
      from: "PENDING",
      to: "REJECTED",
      note,
      action: "spp_payment.rejected",
      staleMessage: NO_LONGER_PENDING,
    },
    now,
  );
}

export function cancelPayment(actor: Actor, paymentId: string, note: string, now = new Date()) {
  return transitionPayment(
    actor,
    paymentId,
    {
      from: "PAID",
      to: "CANCELLED",
      note,
      action: "spp_payment.cancelled",
      staleMessage: "Pembayaran ini tidak lagi berstatus lunas. Muat ulang halaman.",
    },
    now,
  );
}
