import { z } from "zod";

export const ROLE_VALUES = ["ADMIN", "COACH", "ATHLETE"] as const;
export const USER_STATUS_VALUES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export const GENDER_VALUES = ["MALE", "FEMALE"] as const;

export const emailField = z.email("Masukkan email yang valid.").trim().toLowerCase();

export const nameField = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(100, "Nama maksimal 100 karakter.");

// Teks opsional dari form: string kosong diperlakukan sebagai "tidak diisi".
export function optionalText(max: number, label: string) {
  return z.string().trim().max(max, `${label} maksimal ${max} karakter.`);
}

export const idField = z.string().min(1).max(64);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Tanggal dari <input type="date"> ("YYYY-MM-DD"), dicek benar-benar ada di kalender.
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
