import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CompetitionStatus } from "@/generated/prisma/enums";
import { isEditableStatus, publishBlockers, transitionBlocker } from "@/lib/competitions";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { clubDateTimeToUtc } from "@/lib/format";
import { canCreateCompetition, canManageCompetition } from "@/lib/permissions/policies";
import { competitionScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import {
  attachmentKeyFor,
  checkPdfFile,
  isAttachmentKeyOf,
  isPdfBytes,
  PDF_MAX_BYTES,
  sanitizeFileName,
} from "@/lib/storage/pdf";
import { privateDocs } from "@/lib/storage/supabase";
import { dateOnly, emptyToNull } from "@/lib/validations/common";
import type {
  CompetitionFilter,
  CompetitionInput,
  UpdateCompetitionInput,
} from "@/lib/validations/competitions";
import { diffForAudit, writeAuditLog } from "@/services/audit-log-service";
import type { DisciplineOption } from "@/services/time-trial-service";

export const COMPETITION_PAGE_SIZE = 20;

// Pendaftaran yang dihitung sebagai "pendaftar" (yang dibatalkan tidak).
const ACTIVE_REGISTRATION = { status: { not: "CANCELLED" } } as const;

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function listCompetitions(actor: Actor, filter: CompetitionFilter) {
  const where: Prisma.CompetitionWhereInput = {
    AND: [
      competitionScope(actor),
      filter.status ? { status: filter.status } : {},
      filter.q
        ? {
            OR: [
              { name: { contains: filter.q, mode: "insensitive" } },
              { location: { contains: filter.q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await prisma.$transaction([
    prisma.competition.count({ where }),
    prisma.competition.findMany({
      where,
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      skip: (filter.page - 1) * COMPETITION_PAGE_SIZE,
      take: COMPETITION_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        location: true,
        startDate: true,
        endDate: true,
        level: true,
        status: true,
        registrationClosesAt: true,
        createdById: true,
        _count: {
          select: { disciplines: true, registrations: { where: ACTIVE_REGISTRATION } },
        },
      },
    }),
  ]);

  return {
    items: items.map((item) => ({ ...item, canManage: canManageCompetition(actor, item) })),
    total,
    page: filter.page,
    pageSize: COMPETITION_PAGE_SIZE,
  };
}

// Event di luar scope (mis. DRAFT coach lain) dianggap tidak ada (404).
export async function getCompetition(actor: Actor, competitionId: string) {
  const competition = await prisma.competition.findFirst({
    where: { AND: [{ id: competitionId }, competitionScope(actor)] },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      startDate: true,
      endDate: true,
      level: true,
      status: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
      maxEntriesPerAthlete: true,
      attachmentKey: true,
      attachmentName: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      disciplines: {
        orderBy: [
          { discipline: { sportType: "asc" } },
          { discipline: { style: "asc" } },
          { discipline: { distanceMeter: "asc" } },
        ],
        select: {
          disciplineId: true,
          discipline: { select: { name: true, sportType: true, poolLength: true } },
          _count: { select: { entries: true } },
        },
      },
      _count: { select: { registrations: { where: ACTIVE_REGISTRATION } } },
    },
  });
  if (!competition) throw new AppError("NOT_FOUND", "Event tidak ditemukan.");

  const { attachmentKey, ...rest } = competition;
  return {
    ...rest,
    hasAttachment: attachmentKey !== null,
    canManage: canManageCompetition(actor, competition),
    publishBlockers: publishBlockers({
      registrationOpensAt: competition.registrationOpensAt,
      registrationClosesAt: competition.registrationClosesAt,
      disciplineCount: competition.disciplines.length,
    }),
  };
}

// Nomor lomba aktif, ditambah nomor nonaktif yang sudah terpilih di event ini.
export async function listCompetitionDisciplineOptions(
  selectedIds: string[] = [],
): Promise<DisciplineOption[]> {
  return prisma.discipline.findMany({
    where: { OR: [{ isActive: true }, { id: { in: selectedIds } }] },
    orderBy: [{ sportType: "asc" }, { style: "asc" }, { distanceMeter: "asc" }],
    select: { id: true, name: true, sportType: true, poolLength: true },
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function toCompetitionData(input: CompetitionInput) {
  const window =
    input.registrationOpensDate && input.registrationClosesDate
      ? {
          registrationOpensAt: clubDateTimeToUtc(
            input.registrationOpensDate,
            input.registrationOpensTime,
          ),
          registrationClosesAt: clubDateTimeToUtc(
            input.registrationClosesDate,
            input.registrationClosesTime,
          ),
        }
      : { registrationOpensAt: null, registrationClosesAt: null };

  return {
    name: input.name,
    description: emptyToNull(input.description),
    location: input.location,
    level: input.level,
    startDate: dateOnly(input.startDate),
    endDate: dateOnly(input.endDate),
    maxEntriesPerAthlete: input.maxEntriesPerAthlete ? Number(input.maxEntriesPerAthlete) : null,
    ...window,
  };
}

type CompetitionData = ReturnType<typeof toCompetitionData>;

// Timestamp pendaftaran dicatat lengkap (diffForAudit memotong Date menjadi tanggal saja).
function auditView(
  data: Omit<CompetitionData, "registrationOpensAt" | "registrationClosesAt"> & {
    registrationOpensAt: Date | null;
    registrationClosesAt: Date | null;
  },
) {
  return {
    ...data,
    registrationOpensAt: data.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: data.registrationClosesAt?.toISOString() ?? null,
  };
}

// Nomor lomba baru harus ada & aktif.
async function assertDisciplinesSelectable(ids: string[]) {
  if (ids.length === 0) return;
  const found = await prisma.discipline.count({ where: { id: { in: ids }, isActive: true } });
  if (found !== ids.length) {
    throw new AppError("VALIDATION_ERROR", "Ada nomor lomba yang tidak tersedia.", "disciplineIds");
  }
}

export async function createCompetition(actor: Actor, input: CompetitionInput) {
  if (!canCreateCompetition(actor)) {
    throw new AppError("FORBIDDEN", "Kamu tidak bisa membuat event.");
  }
  await assertDisciplinesSelectable(input.disciplineIds);
  const data = toCompetitionData(input);

  return prisma.$transaction(async (tx) => {
    const competition = await tx.competition.create({
      data: {
        ...data,
        createdById: actor.userId,
        disciplines: { create: input.disciplineIds.map((disciplineId) => ({ disciplineId })) },
      },
      select: { id: true },
    });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "competition.created",
      entityType: "Competition",
      entityId: competition.id,
      metadata: { name: data.name, disciplines: input.disciplineIds.length },
    });
    return competition;
  });
}

// Event yang terlihat tapi bukan miliknya → 403 (coach melihat event terbit coach lain).
async function findManageableCompetition(actor: Actor, competitionId: string) {
  const competition = await prisma.competition.findFirst({
    where: { AND: [{ id: competitionId }, competitionScope(actor)] },
    include: { disciplines: { select: { disciplineId: true } } },
  });
  if (!competition) throw new AppError("NOT_FOUND", "Event tidak ditemukan.");
  if (!canManageCompetition(actor, competition)) {
    throw new AppError("FORBIDDEN", "Hanya admin atau pembuat event yang bisa mengubahnya.");
  }
  return competition;
}

function assertEditable(status: CompetitionStatus) {
  if (!isEditableStatus(status)) {
    throw new AppError("CONFLICT", "Event yang sudah selesai atau dibatalkan tidak bisa diubah.");
  }
}

export async function updateCompetition(actor: Actor, input: UpdateCompetitionInput) {
  const before = await findManageableCompetition(actor, input.competitionId);
  assertEditable(before.status);
  const data = toCompetitionData(input);

  const current = new Set(before.disciplines.map((d) => d.disciplineId));
  const next = new Set(input.disciplineIds);
  const added = input.disciplineIds.filter((id) => !current.has(id));
  const removed = [...current].filter((id) => !next.has(id));

  // Event terbit harus tetap memenuhi syarat publish.
  if (before.status !== "DRAFT") {
    const blockers = publishBlockers({ ...data, disciplineCount: next.size });
    if (blockers.length > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Event sudah dipublikasikan. ${blockers.join(" ")}`,
        data.registrationOpensAt ? "disciplineIds" : "registrationOpensDate",
      );
    }
  }
  await assertDisciplinesSelectable(added);
  if (removed.length > 0) {
    const entries = await prisma.competitionEntry.count({
      where: { competitionId: before.id, disciplineId: { in: removed } },
    });
    if (entries > 0) {
      throw new AppError(
        "CONFLICT",
        "Nomor lomba yang sudah punya pendaftar tidak bisa dihapus dari event.",
        "disciplineIds",
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.competition.update({ where: { id: before.id }, data });
    if (removed.length > 0) {
      await tx.competitionDiscipline.deleteMany({
        where: { competitionId: before.id, disciplineId: { in: removed } },
      });
    }
    if (added.length > 0) {
      await tx.competitionDiscipline.createMany({
        data: added.map((disciplineId) => ({ competitionId: before.id, disciplineId })),
      });
    }
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "competition.updated",
      entityType: "Competition",
      entityId: before.id,
      metadata: {
        ...diffForAudit(auditView(before), auditView(data)),
        ...(added.length > 0 || removed.length > 0 ? { disciplines: { added, removed } } : {}),
      },
    });
  });
}

export async function setCompetitionStatus(
  actor: Actor,
  competitionId: string,
  status: CompetitionStatus,
) {
  const competition = await findManageableCompetition(actor, competitionId);
  const registrationCount = await prisma.competitionRegistration.count({
    where: { competitionId, ...ACTIVE_REGISTRATION },
  });
  const blocker = transitionBlocker(competition.status, status, {
    registrationOpensAt: competition.registrationOpensAt,
    registrationClosesAt: competition.registrationClosesAt,
    disciplineCount: competition.disciplines.length,
    registrationCount,
  });
  if (blocker) throw new AppError("CONFLICT", blocker);

  await prisma.$transaction(async (tx) => {
    await tx.competition.update({ where: { id: competitionId }, data: { status } });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "competition.status_changed",
      entityType: "Competition",
      entityId: competitionId,
      metadata: { from: competition.status, to: status },
    });
  });
}

// ---------------------------------------------------------------------------
// PDF event (Supabase Storage, bucket privat)
// ---------------------------------------------------------------------------

// Langkah 1: browser meminta signed upload URL, lalu mengunggah file langsung ke Storage.
export async function requestAttachmentUpload(
  actor: Actor,
  input: { competitionId: string; fileName: string; size: number; type: string },
) {
  const competition = await findManageableCompetition(actor, input.competitionId);
  assertEditable(competition.status);
  const check = checkPdfFile({ name: input.fileName, size: input.size, type: input.type });
  if (!check.ok) throw new AppError("VALIDATION_ERROR", check.message, "file");

  const key = attachmentKeyFor(competition.id);
  const { data, error } = await privateDocs().createSignedUploadUrl(key);
  if (error) throw new Error(`createSignedUploadUrl gagal: ${error.message}`);
  return { key, signedUrl: data.signedUrl };
}

async function removeObjects(keys: string[]) {
  const { error } = await privateDocs().remove(keys);
  // Gagal hapus tidak menggagalkan aksi user; objek yatim bisa dibersihkan belakangan.
  if (error) console.error("Gagal menghapus objek storage", keys, error.message);
}

// Langkah 2: server memeriksa isi file yang sudah terunggah sebelum menyimpannya ke event.
export async function confirmAttachmentUpload(
  actor: Actor,
  input: { competitionId: string; key: string; fileName: string },
) {
  const competition = await findManageableCompetition(actor, input.competitionId);
  assertEditable(competition.status);
  if (!isAttachmentKeyOf(input.key, competition.id)) {
    throw new AppError("VALIDATION_ERROR", "Upload tidak dikenali. Coba unggah ulang.", "file");
  }
  if (competition.attachmentKey === input.key) return;

  const { data: blob, error } = await privateDocs().download(input.key);
  if (error) {
    throw new AppError("VALIDATION_ERROR", "File belum terunggah. Coba unggah ulang.", "file");
  }
  const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  if (blob.size > PDF_MAX_BYTES || !isPdfBytes(head)) {
    await removeObjects([input.key]);
    throw new AppError("VALIDATION_ERROR", "Isi file bukan PDF yang valid.", "file");
  }

  const fileName = sanitizeFileName(input.fileName);
  await prisma.$transaction(async (tx) => {
    await tx.competition.update({
      where: { id: competition.id },
      data: { attachmentKey: input.key, attachmentName: fileName },
    });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "competition.attachment_updated",
      entityType: "Competition",
      entityId: competition.id,
      metadata: { fileName, size: blob.size, replaced: competition.attachmentName },
    });
  });
  if (competition.attachmentKey) await removeObjects([competition.attachmentKey]);
}

export async function removeAttachment(actor: Actor, competitionId: string) {
  const competition = await findManageableCompetition(actor, competitionId);
  assertEditable(competition.status);
  if (!competition.attachmentKey) return;

  await prisma.$transaction(async (tx) => {
    await tx.competition.update({
      where: { id: competitionId },
      data: { attachmentKey: null, attachmentName: null },
    });
    await writeAuditLog(tx, {
      actorUserId: actor.userId,
      action: "competition.attachment_removed",
      entityType: "Competition",
      entityId: competitionId,
      metadata: { fileName: competition.attachmentName },
    });
  });
  await removeObjects([competition.attachmentKey]);
}

// URL unduh berumur pendek; izin lihat sama dengan halaman event (DRAFT hanya pengelola).
export const ATTACHMENT_URL_TTL_SECONDS = 300;

export async function getAttachmentDownloadUrl(actor: Actor, competitionId: string) {
  const competition = await prisma.competition.findFirst({
    where: { AND: [{ id: competitionId }, competitionScope(actor)] },
    select: { attachmentKey: true, attachmentName: true },
  });
  if (!competition?.attachmentKey) throw new AppError("NOT_FOUND", "PDF event tidak ditemukan.");

  const { data, error } = await privateDocs().createSignedUrl(
    competition.attachmentKey,
    ATTACHMENT_URL_TTL_SECONDS,
    { download: competition.attachmentName ?? "event.pdf" },
  );
  if (error) throw new Error(`createSignedUrl gagal: ${error.message}`);
  return data.signedUrl;
}
