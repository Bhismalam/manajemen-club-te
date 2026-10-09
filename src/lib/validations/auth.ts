import { z } from "zod";

const email = z.email("Masukkan email yang valid.").trim().toLowerCase();

const newPassword = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(128, "Password maksimal 128 karakter.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi."),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, "Ulangi password baru."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak sama.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
