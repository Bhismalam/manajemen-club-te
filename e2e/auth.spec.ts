import { expect, request, test } from "@playwright/test";

import {
  clientHeaders,
  readAdminSecrets,
  SEED_PASSWORD,
  sql,
  storageFor,
  totp,
  USERS,
} from "./helpers";

test.describe("login & password", () => {
  test("password salah menampilkan pesan, benar masuk ke dashboard sesuai role", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(USERS.athlete);
    await page.getByLabel("Password", { exact: true }).fill("password-salah");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Email atau password salah.")).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/athlete$/);
    await expect(page.getByRole("heading", { name: /Halo,/ })).toBeVisible();
  });

  test("tombol Keluar di header mencabut session", async ({ browser, baseURL }) => {
    const api = await request.newContext({ baseURL, extraHTTPHeaders: clientHeaders(baseURL!) });
    await api.post("/api/auth/sign-in/email", {
      data: { email: USERS.coach, password: SEED_PASSWORD },
    });
    const context = await browser.newContext({ storageState: await api.storageState() });
    const page = await context.newPage();
    await page.goto("/coach");
    await expect(page.getByRole("heading", { name: /Halo,/ })).toBeVisible();
    await page.locator("header").getByRole("button", { name: "Keluar", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/coach");
    await expect(page).toHaveURL(/\/login/);
    await context.close();
    await api.dispose();
  });

  test("akun baru wajib mengganti password awal dari admin", async ({ browser }) => {
    // Admin membuat akun atlet baru.
    const adminContext = await browser.newContext({ storageState: storageFor("admin") });
    const admin = await adminContext.newPage();
    await admin.goto("/admin/users/new?role=ATHLETE");
    await admin.getByLabel("Nama lengkap").fill("Atlet E2E");
    await admin.getByLabel("Email", { exact: true }).fill("atlet.e2e@club.local");
    await admin.getByLabel("Nomor atlet / KTA").fill("E2E-001");
    await admin.getByLabel("Jenis kelamin").selectOption("FEMALE");
    await admin.getByLabel("Tanggal lahir").fill("2012-05-01");
    await admin.getByRole("button", { name: "Buat akun" }).click();
    const dialog = admin.getByRole("dialog");
    await expect(dialog).toContainText("Password awal");
    const temporaryPassword = (await dialog.locator("dd").nth(1).innerText()).trim();
    await adminContext.close();

    // Login pertama → dipaksa ke halaman ganti password; halaman lain ikut diblokir.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill("atlet.e2e@club.local");
    await page.getByLabel("Password", { exact: true }).fill(temporaryPassword);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/settings\/change-password/);
    await page.goto("/athlete/events");
    await expect(page).toHaveURL(/\/settings\/change-password/);

    const newPassword = "Renang-Cepat-2026!";
    await page.getByLabel("Password saat ini").fill(temporaryPassword);
    await page.getByLabel("Password baru", { exact: true }).fill(newPassword);
    await page.getByLabel("Ulangi password baru").fill(newPassword);
    await page.getByRole("button", { name: "Ganti password" }).click();
    await expect(page).toHaveURL(/\/athlete$/);
    expect(sql(`select "mustChangePassword" from "user" where email='atlet.e2e@club.local'`)).toBe(
      "f",
    );
    await context.close();
  });
});

test.describe("MFA", () => {
  test("token session tidak dikirim di body respons login", async ({ baseURL }) => {
    const api = await request.newContext({ baseURL, extraHTTPHeaders: clientHeaders(baseURL!) });
    const res = await api.post("/api/auth/sign-in/email", {
      data: { email: USERS.coach, password: SEED_PASSWORD },
    });
    expect((await res.json()).token).toBeNull();
    await api.dispose();
  });

  test("admin wajib kode authenticator; kode yang sama tidak bisa dipakai ulang", async ({
    baseURL,
  }) => {
    const { totpURI } = readAdminSecrets();
    // Kode periode berikutnya: belum pernah dipakai, tetap diterima (window ±1).
    const code = totp(totpURI, 30);
    const signIn = async () => {
      const api = await request.newContext({ baseURL, extraHTTPHeaders: clientHeaders(baseURL!) });
      const res = await api.post("/api/auth/sign-in/email", {
        data: { email: USERS.admin, password: SEED_PASSWORD },
      });
      expect((await res.json()).twoFactorRedirect).toBe(true);
      return api;
    };

    const first = await signIn();
    expect(
      (await first.post("/api/auth/two-factor/verify-totp", { data: { code } })).status(),
    ).toBe(200);
    const second = await signIn();
    const replay = await second.post("/api/auth/two-factor/verify-totp", { data: { code } });
    expect(replay.status()).toBe(400);
    expect((await replay.json()).code).toBe("TOTP_CODE_REUSED");
    await Promise.all([first.dispose(), second.dispose()]);
  });

  test("recovery code hanya bisa dipakai sekali", async ({ baseURL }) => {
    const { backupCodes } = readAdminSecrets();
    const code = backupCodes.at(-1)!;
    const attempt = async () => {
      const api = await request.newContext({ baseURL, extraHTTPHeaders: clientHeaders(baseURL!) });
      await api.post("/api/auth/sign-in/email", {
        data: { email: USERS.admin, password: SEED_PASSWORD },
      });
      const res = await api.post("/api/auth/two-factor/verify-backup-code", { data: { code } });
      await api.dispose();
      return res.status();
    };
    expect(await attempt()).toBe(200);
    expect(await attempt()).not.toBe(200);
  });

  test("admin tanpa MFA diarahkan ke halaman setup MFA", async ({ browser, baseURL }) => {
    sql(
      `insert into "user" (id,name,email,role,"emailVerified","twoFactorEnabled","updatedAt") values ('e2e-admin-nomfa','Admin Tanpa MFA','admin.nomfa@club.local','ADMIN',true,false,now())`,
    );
    sql(
      `insert into account (id,"accountId","providerId","userId",password,"updatedAt") select 'e2e-acc-nomfa','e2e-admin-nomfa','credential','e2e-admin-nomfa',password,now() from account where "userId"=(select id from "user" where email='${USERS.coach}') and "providerId"='credential'`,
    );
    const api = await request.newContext({ baseURL, extraHTTPHeaders: clientHeaders(baseURL!) });
    await api.post("/api/auth/sign-in/email", {
      data: { email: "admin.nomfa@club.local", password: SEED_PASSWORD },
    });
    const context = await browser.newContext({ storageState: await api.storageState() });
    const page = await context.newPage();
    for (const path of ["/admin", "/admin/users"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/settings\/security\/mfa-setup/);
    }
    const exportApi = await api.get("/api/admin/competitions/x/registrations/export?format=xlsx", {
      maxRedirects: 0,
    });
    expect(exportApi.headers().location).toContain("/settings/security/mfa-setup");
    await context.close();
    await api.dispose();
  });
});
