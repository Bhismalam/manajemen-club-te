import { expect, test, type Page } from "@playwright/test";

import { storageFor } from "./helpers";

// Dijalankan di project "mobile" (viewport HP). Tidak boleh ada scroll horizontal.
async function expectNoHorizontalScroll(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("load");
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${path} melebar ${overflow}px`).toBeLessThanOrEqual(0);
}

const PAGES = {
  public: ["/", "/programs", "/events", "/contact"],
  athlete: [
    "/athlete",
    "/athlete/events",
    "/athlete/personal-bests",
    "/athlete/results",
    "/athlete/profile",
  ],
  coach: ["/coach", "/coach/athletes", "/coach/training", "/coach/results", "/coach/evaluations"],
  admin: ["/admin", "/admin/users", "/admin/athletes", "/admin/competitions", "/admin/results"],
} as const;

test.describe("tampilan HP", () => {
  test("halaman publik + menu mobile", async ({ page }) => {
    for (const path of PAGES.public) await expectNoHorizontalScroll(page, path);
    await page.goto("/");
    await page.getByRole("button", { name: "Buka menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Program" }).click();
    await expect(page).toHaveURL(/\/programs$/);
  });

  for (const role of ["athlete", "coach", "admin"] as const) {
    test(`dashboard ${role}`, async ({ browser, isMobile }) => {
      const context = await browser.newContext({
        storageState: storageFor(role),
        viewport: { width: 390, height: 844 },
        isMobile,
        hasTouch: true,
      });
      const page = await context.newPage();
      for (const path of PAGES[role]) await expectNoHorizontalScroll(page, path);
      if (role === "athlete") {
        // Navigasi bawah khusus atlet.
        await expect(page.getByRole("link", { name: "Personal Best" }).last()).toBeVisible();
      }
      await context.close();
    });
  }
});
