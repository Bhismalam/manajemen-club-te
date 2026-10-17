// Kategori error aplikasi (doc/ARCHITECTURE.md §15).
export type AppErrorCode =
  "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Bentuk respons standar (CLAUDE.md §8) untuk Server Action dan Route Handler.
export type ActionResult<T = undefined> =
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: AppErrorCode; message: string } };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { success: true, data, message };
}

export function fail(code: AppErrorCode, message: string): ActionResult<never> {
  return { success: false, error: { code, message } };
}

// Ubah AppError menjadi respons; error lain dilempar ulang agar tercatat di log
// dan pengguna hanya melihat pesan umum (doc/SECURITY.md §16).
export function toActionError(error: unknown): ActionResult<never> {
  if (isAppError(error)) return fail(error.code, error.message);
  throw error;
}
