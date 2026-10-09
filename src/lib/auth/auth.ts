import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/services/email-service";

export const ACCOUNT_DISABLED_CODE = "ACCOUNT_DISABLED";

// BETTER_AUTH_SECRET dan BETTER_AUTH_URL dibaca otomatis dari environment.
export const auth = betterAuth({
  appName: "Swim & Finswimming Club",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Akun dibuat oleh admin, tidak ada pendaftaran publik.
    disableSignUp: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset password akun klub",
        text: [
          `Halo ${user.name},`,
          "",
          "Kami menerima permintaan reset password untuk akunmu.",
          `Buka link berikut dalam 30 menit untuk membuat password baru:`,
          url,
          "",
          "Jika kamu tidak meminta reset password, abaikan email ini.",
        ].join("\n"),
      });
    },
  },
  user: {
    additionalFields: {
      status: {
        type: ["ACTIVE", "INACTIVE", "SUSPENDED"],
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Lapisan kedua di samping `banned`: akun nonaktif / terhapus tidak boleh login.
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { status: true, deletedAt: true },
          });
          if (!user || user.status !== "ACTIVE" || user.deletedAt) {
            throw new APIError("FORBIDDEN", {
              code: ACCOUNT_DISABLED_CODE,
              message: "Account is disabled",
            });
          }
        },
        after: async (session) => {
          await prisma.user.update({
            where: { id: session.userId },
            data: { lastLoginAt: new Date() },
          });
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
      "/two-factor/*": { window: 300, max: 5 },
    },
  },
  plugins: [
    admin({
      defaultRole: "ATHLETE",
      adminRoles: ["ADMIN"],
      roles: {
        ADMIN: adminAc,
        COACH: userAc,
        ATHLETE: userAc,
      },
    }),
    twoFactor({
      issuer: "Swim & Finswimming Club",
    }),
    // Harus terakhir: meneruskan Set-Cookie dari auth.api di Server Action.
    nextCookies(),
  ],
});
