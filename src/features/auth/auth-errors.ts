type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email atau password salah.",
  BANNED_USER: "Akun kamu dinonaktifkan. Hubungi admin klub.",
  ACCOUNT_DISABLED: "Akun kamu dinonaktifkan. Hubungi admin klub.",
  INVALID_TOKEN: "Link reset password tidak valid atau sudah kedaluwarsa.",
  PASSWORD_TOO_SHORT: "Password minimal 8 karakter.",
  PASSWORD_TOO_LONG: "Password maksimal 128 karakter.",
};

export function authErrorMessage(error: AuthErrorLike): string {
  if (error?.status === 429) return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code] as string;
  return "Terjadi kesalahan. Coba lagi.";
}
