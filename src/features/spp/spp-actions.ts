"use server";

import { refresh } from "next/cache";

import type { ActionResult } from "@/lib/errors";
import { fail, ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import {
  recordSppPaymentSchema,
  requestMyProofUploadSchema,
  requestProofUploadSchema,
  setSppRateSchema,
  sppPaymentIdSchema,
  sppReviewNoteSchema,
  submitSppPaymentSchema,
} from "@/lib/validations/spp";
import { markNotificationsRead } from "@/services/notification-service";
import { enforceRateLimit } from "@/services/rate-limit-service";
import {
  approvePayment,
  cancelPayment,
  recordPayment,
  rejectPayment,
  requestProofUpload,
  setRate,
  SPP_ADMIN_PATH,
  submitPayment,
} from "@/services/spp-service";

export async function setSppRateAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN");
  const parsed = setSppRateSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("payment", actor.userId);
    await setRate(actor, parsed.data);
    refresh();
    return ok(undefined, "Tarif SPP disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}

type UploadTicket = { key: string; signedUrl: string };

export async function requestProofUploadAction(
  input: unknown,
): Promise<ActionResult<UploadTicket>> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = requestProofUploadSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("upload", actor.userId);
    return ok(await requestProofUpload(actor, parsed.data));
  } catch (error) {
    return toActionError(error);
  }
}

// Atlet: athleteId selalu dari session.
export async function requestMyProofUploadAction(
  input: unknown,
): Promise<ActionResult<UploadTicket>> {
  const actor = await requireActor("ATHLETE");
  if (!actor.athleteId) return fail("FORBIDDEN", "Profil atlet belum aktif.");
  const parsed = requestMyProofUploadSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("upload", actor.userId);
    return ok(await requestProofUpload(actor, { ...parsed.data, athleteId: actor.athleteId }));
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordSppPaymentAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = recordSppPaymentSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("payment", actor.userId);
    await recordPayment(actor, parsed.data);
    refresh();
    return ok(undefined, "Pembayaran dicatat lunas.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitMySppPaymentAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ATHLETE");
  const parsed = submitSppPaymentSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("payment", actor.userId);
    await submitPayment(actor, parsed.data);
    refresh();
    return ok(undefined, "Bukti terkirim. Menunggu konfirmasi admin atau pelatih.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveSppPaymentAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = sppPaymentIdSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("payment", actor.userId);
    await approvePayment(actor, parsed.data.paymentId);
    refresh();
    return ok(undefined, "Pembayaran disetujui.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectSppPaymentAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = sppReviewNoteSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("payment", actor.userId);
    await rejectPayment(actor, parsed.data.paymentId, parsed.data.note);
    refresh();
    return ok(undefined, "Pengajuan ditolak.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelSppPaymentAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = sppReviewNoteSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("payment", actor.userId);
    await cancelPayment(actor, parsed.data.paymentId, parsed.data.note);
    refresh();
    return ok(undefined, "Status lunas dibatalkan.");
  } catch (error) {
    return toActionError(error);
  }
}

// Saat admin membuka halaman SPP, notifikasi bukti baru ditandai dibaca.
export async function markSppNotificationsReadAction(): Promise<void> {
  const actor = await requireActor("ADMIN");
  await markNotificationsRead(actor.userId, SPP_ADMIN_PATH);
}
