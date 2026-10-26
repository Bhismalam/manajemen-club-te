type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email atau password salah.",
  BANNED_USER: "Akun kamu dinonaktifkan. Hubungi admin klub.",
  ACCOUNT_DISABLED: "Akun kamu dinonaktifkan. Hubungi admin klub.",
  INVALID_TOKEN: "Link reset password tidak valid atau sudah kedaluwarsa.",
  PASSWORD_TOO_SHORT: "Password minimal 8 karakter.",
  PASSWORD_TOO_LONG: "Password maksimal 128 karakter.",
  INVALID_PASSWORD: "Password salah.",
  INVALID_CODE: "Kode salah. Periksa kembali kode di aplikasi authenticator.",
  INVALID_BACKUP_CODE: "Recovery code salah atau sudah pernah dipakai.",
  INVALID_TWO_FACTOR_COOKIE: "Sesi verifikasi sudah kedaluwarsa. Silakan masuk ulang.",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "Terlalu banyak kode salah. Silakan masuk ulang.",
  ACCOUNT_TEMPORARILY_LOCKED:
    "Terlalu banyak percobaan gagal. Akun dikunci sementara, coba lagi nanti.",
  ADMIN_MFA_REQUIRED: "MFA wajib untuk akun admin dan tidak bisa dinonaktifkan.",
  TOTP_CODE_REUSED: "Kode ini sudah dipakai. Tunggu kode berikutnya di aplikasi authenticator.",
};

// Error yang mengharuskan user mengulang login dari awal.
export const RESTART_LOGIN_CODES = new Set([
  "INVALID_TWO_FACTOR_COOKIE",
  "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE",
]);

export function authErrorMessage(error: AuthErrorLike): string {
  if (error?.status === 429) return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code] as string;
  return "Terjadi kesalahan. Coba lagi.";
}
