import { z } from "zod";

import { isValidMonth, SPP_MAX_AMOUNT } from "@/lib/spp";

import { idField, isValidDateString, optionalText } from "./common";

const monthField = z.string().refine(isValidMonth, "Pilih bulan yang valid.");

const amountField = z
  .number("Isi nominal.")
  .int("Nominal harus bilangan bulat.")
  .positive("Nominal harus lebih dari 0.")
  .max(SPP_MAX_AMOUNT, "Nominal terlalu besar.");

const paidOnField = z.string().refine(isValidDateString, "Isi tanggal bayar yang valid.");
const proofKeyField = z.string().min(1).max(200);
const proofNameField = z.string().min(1).max(255);

export const SPP_FILTER_STATUSES = ["PAID", "PENDING", "UNPAID"] as const;

export const setSppRateSchema = z.object({
  month: monthField,
  amount: amountField,
});
export type SetSppRateInput = z.infer<typeof setSppRateSchema>;

const paymentFields = {
  month: monthField,
  amount: amountField,
  method: z.enum(["CASH", "TRANSFER"], "Pilih metode pembayaran."),
  paidOn: paidOnField,
  note: optionalText(300, "Catatan"),
};

// Admin/pelatih mencatat lunas; bukti opsional.
export const recordSppPaymentSchema = z.object({
  ...paymentFields,
  athleteId: idField,
  proofKey: proofKeyField.optional(),
  proofName: proofNameField.optional(),
});
export type RecordSppPaymentInput = z.infer<typeof recordSppPaymentSchema>;

// Atlet mengajukan pembayaran sendiri: bukti wajib, athleteId selalu dari session.
export const submitSppPaymentSchema = z.object({
  ...paymentFields,
  proofKey: proofKeyField,
  proofName: proofNameField,
});
export type SubmitSppPaymentInput = z.infer<typeof submitSppPaymentSchema>;

// Field form sebelum file diunggah (key bukti baru ada setelah upload).
export const sppPaymentFormSchema = z.object(paymentFields);
export type SppPaymentFormInput = z.infer<typeof sppPaymentFormSchema>;

const proofFileFields = {
  month: monthField,
  size: z.number().int().nonnegative(),
  type: z.string().max(100),
};

export const requestProofUploadSchema = z.object({ ...proofFileFields, athleteId: idField });
export const requestMyProofUploadSchema = z.object(proofFileFields);

export const sppPaymentIdSchema = z.object({ paymentId: idField });

// Alasan wajib untuk menolak pengajuan atau membatalkan lunas.
export const sppReviewNoteSchema = z.object({
  paymentId: idField,
  note: z
    .string()
    .trim()
    .min(3, "Tuliskan alasannya (minimal 3 karakter).")
    .max(300, "Alasan maksimal 300 karakter."),
});

export const sppBoardFilterSchema = z.object({
  month: z.string().refine(isValidMonth).optional().catch(undefined),
  group: z.string().trim().max(64).catch(""),
  status: z.enum(SPP_FILTER_STATUSES).optional().catch(undefined),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).catch(1),
});
export type SppBoardFilter = z.infer<typeof sppBoardFilterSchema>;
