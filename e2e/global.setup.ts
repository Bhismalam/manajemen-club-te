import fs from "node:fs";
import path from "node:path";

import { expect, request, test as setup } from "@playwright/test";

import {
  AUTH_DIR,
  resetAndSeedDatabase,
  SEED_PASSWORD,
  sql,
  storageFor,
  totp,
  USERS,
  clientHeaders,
} from "./helpers";

// Sekali per run: database test di-reset ke data seed, lalu sesi tiap role disimpan.
setup("reset database & login semua role", async ({ baseURL }) => {
  expect(SEED_PASSWORD.length, "SEED_PASSWORD wajib ada di .env.local").toBeGreaterThanOrEqual(8);
  resetAndSeedDatabase();
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const signIn = async (email: string) => {
    const ctx = await request.newContext({ baseURL, extraHTTPHeaders: clientHeaders(baseURL!) });
    const res = await ctx.post("/api/auth/sign-in/email", {
      data: { email, password: SEED_PASSWORD },
    });
    expect(res.status(), `login ${email}`).toBe(200);
    return ctx;
  };

  for (const role of ["coach", "athlete", "athlete2"] as const) {
    const ctx = await signIn(USERS[role]);
    await ctx.storageState({ path: storageFor(role) });
    await ctx.dispose();
  }

  // Admin seed belum punya MFA: aktifkan lewat API, simpan secret & recovery code untuk test.
  const admin = await signIn(USERS.admin);
  const enable = await admin.post("/api/auth/two-factor/enable", {
    data: { password: SEED_PASSWORD },
  });
  expect(enable.status()).toBe(200);
  const { totpURI, backupCodes } = (await enable.json()) as {
    totpURI: string;
    backupCodes: string[];
  };
  const verify = await admin.post("/api/auth/two-factor/verify-totp", {
    data: { code: totp(totpURI) },
  });
  expect(verify.status()).toBe(200);
  expect(sql(`select "twoFactorEnabled" from "user" where email='${USERS.admin}'`)).toBe("t");
  await admin.storageState({ path: storageFor("admin") });
  await admin.dispose();
  fs.writeFileSync(
    path.join(AUTH_DIR, "admin-secrets.json"),
    JSON.stringify({ totpURI, backupCodes }),
  );
  sql("delete from rate_limit");
});
