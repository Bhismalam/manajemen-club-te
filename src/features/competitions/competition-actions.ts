"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/errors";
import { ok, toActionError, validationFail } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import {
  attachmentConfirmSchema,
  attachmentRequestSchema,
  competitionSchema,
  competitionStatusSchema,
  updateCompetitionSchema,
} from "@/lib/validations/competitions";
import {
  confirmAttachmentUpload,
  createCompetition,
  removeAttachment,
  requestAttachmentUpload,
  setCompetitionStatus,
  updateCompetition,
} from "@/services/competition-service";
import { enforceRateLimit } from "@/services/rate-limit-service";

// Admin & pelatih; kepemilikan event (coach hanya event buatannya) dicek di service.
// Aksi yang mengubah halaman detail memanggil `refresh()`: data halaman terbaru ikut dalam
// respons aksi yang sama, jadi UI berubah tanpa request kedua dari `router.refresh()`.

const STATUS_MESSAGE = {
  DRAFT: "Event dikembalikan ke draft.",
  UPCOMING: "Event dipublikasikan.",
  ONGOING: "Event ditandai berlangsung.",
  COMPLETED: "Event ditandai selesai.",
  CANCELLED: "Event dibatalkan.",
} as const;

export async function createCompetitionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = competitionSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    return ok(await createCompetition(actor, parsed.data), "Event dibuat sebagai draft.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCompetitionAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = updateCompetitionSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await updateCompetition(actor, parsed.data);
    refresh();
    return ok(undefined, "Event disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function setCompetitionStatusAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = competitionStatusSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await setCompetitionStatus(actor, parsed.data.competitionId, parsed.data.status);
    refresh();
    return ok(undefined, STATUS_MESSAGE[parsed.data.status]);
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestAttachmentUploadAction(
  input: unknown,
): Promise<ActionResult<{ key: string; signedUrl: string }>> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = attachmentRequestSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await enforceRateLimit("upload", actor.userId);
    return ok(await requestAttachmentUpload(actor, parsed.data));
  } catch (error) {
    return toActionError(error);
  }
}

export async function confirmAttachmentUploadAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = attachmentConfirmSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await confirmAttachmentUpload(actor, parsed.data);
    refresh();
    return ok(undefined, "PDF event disimpan.");
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeAttachmentAction(input: unknown): Promise<ActionResult> {
  const actor = await requireActor("ADMIN", "COACH");
  const parsed = z.object({ competitionId: z.string().min(1).max(64) }).safeParse(input);
  if (!parsed.success) return validationFail(parsed.error.issues);
  try {
    await removeAttachment(actor, parsed.data.competitionId);
    refresh();
    return ok(undefined, "PDF event dihapus.");
  } catch (error) {
    return toActionError(error);
  }
}
