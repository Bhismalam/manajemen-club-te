import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";

import { sql, storageFor, toArrayBuffer } from "./helpers";

// Alur utama: atlet mendaftar event → admin melihat di rekap → export Excel berisi atlet tsb.
test("atlet mendaftar event, admin melihat di rekap dan export Excel", async ({ browser }) => {
  const eventId = sql(
    `select id from competition where status='UPCOMING' order by "createdAt" limit 1`,
  );

  const athleteContext = await browser.newContext({ storageState: storageFor("athlete2") });
  const athlete = await athleteContext.newPage();
  await athlete.goto("/athlete/events");
  await athlete
    .getByRole("link", { name: /Kejuaraan/ })
    .first()
    .click();
  await expect(athlete).toHaveURL(new RegExp(`/athlete/events/${eventId}`));
  await expect(athlete.getByText("Belum terdaftar")).toBeVisible();

  await athlete.getByRole("checkbox").first().click();
  await athlete.getByRole("button", { name: "Daftar" }).click();
  await expect(athlete.getByText("Pendaftaran berhasil. Admin sudah diberi tahu.")).toBeVisible();
  await expect(athlete.getByText(/Terdaftar · 1 nomor/)).toBeVisible();
  await athleteContext.close();

  const adminContext = await browser.newContext({ storageState: storageFor("admin") });
  const admin = await adminContext.newPage();
  await admin.goto("/admin");
  await expect(admin.getByText(/Citra Lestari mendaftar 1 nomor/)).toBeVisible();

  await admin.goto(`/admin/competitions/${eventId}/registrations`);
  await expect(admin.getByText("Citra Lestari").first()).toBeVisible();

  const [download] = await Promise.all([
    admin.waitForEvent("download"),
    admin.getByRole("button", { name: "Download Excel" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^pendaftar-.+\.xlsx$/);
  const workbook = new ExcelJS.Workbook();
  const chunks = (await (await download.createReadStream()).toArray()) as Buffer[];
  await workbook.xlsx.load(toArrayBuffer(Buffer.concat(chunks)));
  const names: unknown[] = [];
  workbook.getWorksheet("Per Atlet")!.eachRow((row) => names.push(row.getCell(2).value));
  expect(names).toContain("Citra Lestari");
  await adminContext.close();
});
