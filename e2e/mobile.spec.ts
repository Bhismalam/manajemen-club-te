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
  guest: ["/login", "/forgot-password"],
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
  test("halaman login", async ({ page }) => {
    for (const path of PAGES.guest) await expectNoHorizontalScroll(page, path);
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
