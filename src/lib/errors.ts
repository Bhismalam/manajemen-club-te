// Kategori error aplikasi (doc/ARCHITECTURE.md §15).
export type AppErrorCode =
  "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    // Nama field form yang menyebabkan error (mis. "email"), agar UI bisa menandai input.
    readonly field?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export type ActionError = { code: AppErrorCode; message: string; field?: string };

// Bentuk respons standar (CLAUDE.md §8) untuk Server Action dan Route Handler.
export type ActionResult<T = undefined> =
  { success: true; data: T; message?: string } | { success: false; error: ActionError };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { success: true, data, message };
}

export function fail(code: AppErrorCode, message: string, field?: string): ActionResult<never> {
  return { success: false, error: { code, message, field } };
}

// Ubah AppError menjadi respons; error lain dilempar ulang agar tercatat di log
// dan pengguna hanya melihat pesan umum (doc/SECURITY.md §16).
export function toActionError(error: unknown): ActionResult<never> {
  if (isAppError(error)) return fail(error.code, error.message, error.field);
  throw error;
}

// Pesan validasi Zod pertama sebagai ActionResult.
export function validationFail(issues: { message: string; path: PropertyKey[] }[]) {
  const first = issues[0];
  return fail(
    "VALIDATION_ERROR",
    first?.message ?? "Input tidak valid.",
    first?.path[0] !== undefined ? String(first.path[0]) : undefined,
  );
}
