import { expect, test } from "@playwright/test";

import { sql, storageFor } from "./helpers";

// Alur SPP lewat UI. Unggah bukti butuh Supabase asli, jadi tidak diuji di sini
// (service-nya diuji di spp-service.int.test.ts dengan storage mock).
test.describe.configure({ mode: "serial" });

const athleteId = (email: string) =>
  sql(
    `select a.id from athlete_profile a join "user" u on u.id=a."userId" where u.email='${email}'`,
  );

test("admin mengatur tarif dan mencatat lunas", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageFor("admin") });
  const page = await context.newPage();
  await page.goto("/admin/spp");

  await expect(page.getByRole("heading", { name: "Tarif SPP" })).toBeVisible();
  await page.getByLabel("Tarif per bulan (Rp)").fill("300000");
  await page.getByRole("button", { name: "Simpan tarif" }).click();
  await expect(page.getByText("Tarif SPP disimpan.")).toBeVisible();

  const row = page.locator("li").filter({ has: page.getByRole("button", { name: "Catat lunas" }) });
  const before = await row.count();
  expect(before).toBeGreaterThan(0);
  await row.first().getByRole("button", { name: "Catat lunas" }).click();
  await expect(page.getByLabel("Nominal (Rp)")).toHaveValue("300000");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByText("Pembayaran dicatat lunas.")).toBeVisible();
  await expect(row).toHaveCount(before - 1);
  await context.close();
});

test("pelatih hanya melihat atlet binaannya dan tidak bisa mengatur tarif", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageFor("coach") });
  const page = await context.newPage();
  await page.goto("/coach/spp");

  await expect(page.getByRole("heading", { level: 1, name: "SPP" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tarif SPP" })).toHaveCount(0);
  await expect(page.getByLabel("Cari atlet")).toBeVisible();
  // atlet3 ada di kelompok pelatih lain (lihat e2e/access.spec.ts).
  const otherName = sql(`select "name" from "user" where email='atlet3@club.local'`);
  await expect(page.getByText(otherName, { exact: true })).toHaveCount(0);
  await context.close();
});

test("atlet melihat statusnya sendiri dan bukan halaman pengelola", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageFor("athlete") });
  const page = await context.newPage();
  await page.goto("/athlete/spp");

  await expect(page.getByRole("heading", { name: "Riwayat" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kirim bukti pembayaran" })).toBeVisible();
  await expect(page.getByText("Lunas").first()).toBeVisible();

  await page.goto("/admin/spp");
  await expect(page).toHaveURL(/\/athlete$/);
  await context.close();
});

test("form bukti membaca file yang dipilih dan menolak jenis yang salah", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageFor("athlete") });
  const page = await context.newPage();
  await page.goto("/athlete/spp");

  // Sengaja tanpa menunggu hidrasi: pilihan file tidak boleh hilang.
  await page.getByLabel("Bukti bayar").setInputFiles({
    name: "catatan.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("bukan bukti"),
  });
  await page.getByRole("button", { name: "Kirim bukti" }).click();
  await expect(page.getByText("Bukti harus berupa foto (JPG, PNG, WebP) atau PDF.")).toBeVisible();

  await page.getByLabel("Bukti bayar").setInputFiles([]);
  await page.getByRole("button", { name: "Kirim bukti" }).click();
  await expect(page.getByText("Lampirkan bukti pembayaran.")).toBeVisible();
  await context.close();
});

test("bukti atlet lain tidak bisa dibuka", async ({ browser }) => {
  const otherId = athleteId("atlet3@club.local");
  // Satu baris: helper sql() meneruskan query lewat shell.
  const paymentId = sql(
    `insert into spp_payment (id, "athleteId", period, amount, status, method, "paidOn", "proofKey", "proofName", "submittedById", "updatedAt") select 'e2e-spp-proof', id, date_trunc('month', now())::date, 1000, 'PENDING', 'TRANSFER', now()::date, 'spp/x/2026-01/x.jpg', 'x.jpg', "userId", now() from athlete_profile where id='${otherId}' on conflict ("athleteId", period) do update set "proofKey" = excluded."proofKey" returning id`,
  );
  const context = await browser.newContext({ storageState: storageFor("athlete") });
  const response = await context.request.get(`/api/spp/payments/${paymentId}/proof`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(404);
  await context.close();
});

test("halaman SPP pas di layar ponsel", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: storageFor("athlete"),
    viewport: { width: 375, height: 800 },
  });
  const page = await context.newPage();
  await page.goto("/athlete/spp");
  await expect(page.getByRole("heading", { name: "Riwayat" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await context.close();
});
