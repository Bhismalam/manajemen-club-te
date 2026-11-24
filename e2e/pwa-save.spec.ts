import { expect, test } from "@playwright/test";

import { sql, storageFor } from "./helpers";

for (const form of ["attendance", "time-trial"] as const) {
  test(`${form}: respons terputus mempertahankan isian tanpa pengiriman ulang otomatis`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: storageFor("coach") });
    try {
      const page = await context.newPage();
      if (form === "attendance") {
        const sessionId = sql(
          `select s.id from training_session s join training_group g on g.id=s."trainingGroupId" join coach_profile c on c.id=g."coachId" join "user" u on u.id=c."userId" where u.email='coach.rina@club.local' and s."startsAt" < now() order by s."startsAt" desc limit 1`,
        );
        expect(sessionId).not.toBe("");
        await page.goto(`/coach/training/${sessionId}`);
      } else {
        await page.goto("/coach/time-trials/new");
        const discipline = page.getByLabel("Nomor lomba", { exact: true });
        const disciplineId = await discipline.locator("option").nth(1).getAttribute("value");
        await discipline.selectOption(disciplineId!);
        const athlete = page.getByLabel("Atlet baris 1", { exact: true });
        const athleteId = await athlete.locator("option").nth(1).getAttribute("value");
        await athlete.selectOption(athleteId!);
        await page.getByLabel("Waktu baris 1", { exact: true }).fill("58.27");
      }

      const note =
        form === "attendance"
          ? page.getByLabel(/^Catatan untuk /).first()
          : page.getByLabel("Catatan baris 1", { exact: true });
      await note.fill("Isian harus tetap ada setelah jaringan gagal");
      let submissions = 0;
      // Abort only the Server Action request; it never reaches the database.
      await page.route("**/*", async (route) => {
        const request = route.request();
        if (request.method() === "POST" && request.headers()["next-action"]) {
          submissions++;
          await route.abort("failed");
        } else {
          await route.continue();
        }
      });
      const save = page.getByRole("button", {
        name: form === "attendance" ? "Simpan absensi" : "Simpan time trial",
        exact: true,
      });
      await save.click();
      await expect(
        page.getByText("Hasil penyimpanan belum dapat dipastikan", { exact: true }),
      ).toBeVisible();
      await expect(save).toBeEnabled();
      await expect(note).toHaveValue("Isian harus tetap ada setelah jaringan gagal");
      await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
      if (form === "time-trial") {
        await expect(page.getByLabel("Waktu baris 1", { exact: true })).toHaveValue("58.27");
        await expect(
          page.getByRole("link", { name: "daftar time trial (tab baru)" }),
        ).toHaveAttribute("target", "_blank");
      }
      await context.setOffline(true);
      await expect(page.getByText("Koneksi terputus", { exact: true })).toBeVisible();
      await context.setOffline(false);
      await expect(page.getByText("Koneksi terputus", { exact: true })).toHaveCount(0);
      await page.waitForTimeout(300);
      expect(submissions).toBe(1);
      await expect(note).toHaveValue("Isian harus tetap ada setelah jaringan gagal");
    } finally {
      await context.close();
    }
  });
}
