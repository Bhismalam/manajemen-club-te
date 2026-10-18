import { z } from "zod";

import { clubDateTimeToUtc } from "@/lib/format";

import { isValidDateString, optionalText } from "./common";

export const COMPETITION_LEVEL_VALUES = [
  "CLUB",
  "REGIONAL",
  "PROVINCIAL",
  "NATIONAL",
  "INTERNATIONAL",
] as const;

export const COMPETITION_STATUS_VALUES = [
  "DRAFT",
  "UPCOMING",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_ENTRIES_LIMIT = 20;

// Semua field berupa string dari form; tanggal event = kalender (@db.Date),
// periode pendaftaran = tanggal + jam klub yang disimpan sebagai UTC.
export const competitionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Nama event minimal 3 karakter.")
      .max(150, "Nama event maksimal 150 karakter."),
    description: optionalText(5000, "Deskripsi"),
    location: z
      .string()
      .trim()
      .min(2, "Isi lokasi event.")
      .max(150, "Lokasi maksimal 150 karakter."),
    level: z.enum(COMPETITION_LEVEL_VALUES, "Pilih tingkat event."),
    startDate: z.string().refine(isValidDateString, "Pilih tanggal mulai."),
    endDate: z.string().refine(isValidDateString, "Pilih tanggal selesai."),
    registrationOpensDate: z.string(),
    registrationOpensTime: z.string(),
    registrationClosesDate: z.string(),
    registrationClosesTime: z.string(),
    maxEntriesPerAthlete: z
      .string()
      .trim()
      .refine((value) => {
        if (value === "") return true;
        const n = Number(value);
        return Number.isInteger(n) && n >= 1 && n <= MAX_ENTRIES_LIMIT;
      }, `Isi angka 1–${MAX_ENTRIES_LIMIT}, atau kosongkan jika tidak dibatasi.`),
    disciplineIds: z
      .array(z.string().min(1).max(64))
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, "Nomor lomba tidak boleh dobel."),
  })
  .superRefine((data, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    const datesValid = isValidDateString(data.startDate) && isValidDateString(data.endDate);
    if (datesValid && data.endDate < data.startDate) {
      issue("endDate", "Tanggal selesai tidak boleh sebelum tanggal mulai.");
    }

    const hasOpens = data.registrationOpensDate !== "";
    const hasCloses = data.registrationClosesDate !== "";
    if (!hasOpens && !hasCloses) return;
    if (!hasOpens) return issue("registrationOpensDate", "Isi tanggal pembukaan pendaftaran.");
    if (!hasCloses) return issue("registrationClosesDate", "Isi tanggal penutupan pendaftaran.");

    if (!isValidDateString(data.registrationOpensDate)) {
      return issue("registrationOpensDate", "Tanggal pembukaan tidak valid.");
    }
    if (!TIME_PATTERN.test(data.registrationOpensTime)) {
      return issue("registrationOpensTime", "Isi jam pembukaan.");
    }
    if (!isValidDateString(data.registrationClosesDate)) {
      return issue("registrationClosesDate", "Tanggal penutupan tidak valid.");
    }
    if (!TIME_PATTERN.test(data.registrationClosesTime)) {
      return issue("registrationClosesTime", "Isi jam penutupan.");
    }

    const opensAt = clubDateTimeToUtc(data.registrationOpensDate, data.registrationOpensTime);
    const closesAt = clubDateTimeToUtc(data.registrationClosesDate, data.registrationClosesTime);
    if (closesAt <= opensAt) {
      return issue("registrationClosesDate", "Penutupan harus setelah pembukaan pendaftaran.");
    }
    if (datesValid && data.registrationClosesDate > data.startDate) {
      issue(
        "registrationClosesDate",
        "Pendaftaran harus ditutup paling lambat di hari mulai event.",
      );
    }
  });
export type CompetitionInput = z.infer<typeof competitionSchema>;

export const updateCompetitionSchema = competitionSchema.and(
  z.object({ competitionId: z.string().min(1).max(64) }),
);
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;

export const competitionStatusSchema = z.object({
  competitionId: z.string().min(1).max(64),
  status: z.enum(COMPETITION_STATUS_VALUES),
});

export const competitionFilterSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(COMPETITION_STATUS_VALUES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type CompetitionFilter = z.infer<typeof competitionFilterSchema>;

export const attachmentRequestSchema = z.object({
  competitionId: z.string().min(1).max(64),
  fileName: z.string().trim().min(1).max(255),
  size: z.number().int(),
  type: z.string().max(100),
});

export const attachmentConfirmSchema = z.object({
  competitionId: z.string().min(1).max(64),
  key: z.string().min(1).max(200),
  fileName: z.string().trim().min(1).max(255),
});
