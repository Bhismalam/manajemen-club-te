import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, twoFactor } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

import { prisma } from "@/lib/db/prisma";

// Konfigurasi dasar. Alur login, MFA wajib admin, dan guard dikerjakan di Phase 2 / 2b.
export const auth = betterAuth({
  appName: "Swim & Finswimming Club",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Akun dibuat oleh admin, tidak ada pendaftaran publik.
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      status: {
        type: ["ACTIVE", "INACTIVE", "SUSPENDED"],
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
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
  ],
});
