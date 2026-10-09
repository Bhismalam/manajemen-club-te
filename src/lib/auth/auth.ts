import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/services/audit-log-service";
import { sendEmail } from "@/services/email-service";

export const ACCOUNT_DISABLED_CODE = "ACCOUNT_DISABLED";
export const ADMIN_MFA_REQUIRED_CODE = "ADMIN_MFA_REQUIRED";

// Endpoint verifikasi MFA saat login (menerima opsi `trustDevice`).
const TWO_FACTOR_SIGN_IN_PATHS = new Set([
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/two-factor/verify-otp",
]);

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
    user: {
      update: {
        // Audit perubahan status MFA oleh user sendiri (reset oleh admin dicatat di mfa-service).
        after: async (user, context) => {
          const action =
            context?.path === "/two-factor/verify-totp" && user.twoFactorEnabled
              ? "mfa.enabled"
              : context?.path === "/two-factor/disable"
                ? "mfa.disabled"
                : null;
          if (!action) return;
          await writeAuditLog(prisma, {
            actorUserId: user.id,
            action,
            entityType: "User",
            entityId: user.id,
          });
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Admin tidak boleh memakai "percayai perangkat ini": opsi diabaikan di server.
      if (TWO_FACTOR_SIGN_IN_PATHS.has(ctx.path) && ctx.body?.trustDevice) {
        const cookie = ctx.context.createAuthCookie("two_factor");
        const identifier = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
        const pending = identifier
          ? await ctx.context.internalAdapter.findVerificationValue(identifier)
          : null;
        const user = pending
          ? await prisma.user.findUnique({ where: { id: pending.value }, select: { role: true } })
          : null;
        if (user?.role === "ADMIN") {
          return { context: { body: { ...ctx.body, trustDevice: false } } };
        }
      }

      // MFA wajib untuk admin: tidak bisa dinonaktifkan sendiri.
      if (ctx.path === "/two-factor/disable") {
        const session = await getSessionFromCtx(ctx);
        if (session?.user.role === "ADMIN") {
          throw new APIError("FORBIDDEN", {
            code: ADMIN_MFA_REQUIRED_CODE,
            message: "Admin cannot disable MFA",
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/two-factor/generate-backup-codes") return;
      if (ctx.context.returned instanceof APIError) return;
      const userId = ctx.context.session?.user.id;
      if (!userId) return;
      await writeAuditLog(prisma, {
        actorUserId: userId,
        action: "mfa.backup_codes_regenerated",
        entityType: "User",
        entityId: userId,
      });
    }),
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
      "/two-factor/*": { window: 300, max: 10 },
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
      // "Percayai perangkat ini" berlaku 30 hari (tidak untuk admin, lihat hooks.before).
      trustDeviceMaxAge: 60 * 60 * 24 * 30,
    }),
    // Harus terakhir: meneruskan Set-Cookie dari auth.api di Server Action.
    nextCookies(),
  ],
});
