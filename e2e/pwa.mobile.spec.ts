import { expect, test } from "@playwright/test";

import { storageFor } from "./helpers";

test("panduan iPhone memakai Bagikan dan Tambahkan ke Layar Utama", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: storageFor("athlete"),
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  try {
    await context.addInitScript(() => {
      window.addEventListener(
        "beforeinstallprompt",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true,
      );
    });
    const page = await context.newPage();
    await page.goto("/athlete");
    await page.getByRole("button", { name: /^Menu akun / }).click();
    await page.getByRole("menuitem", { name: "Pasang TE" }).click();
    await expect(page.getByRole("dialog")).toContainText("Ketuk menu Bagikan");
    await expect(page.getByRole("dialog")).toContainText("Tambahkan ke Layar Utama");
    await expect(page.getByRole("button", { name: "Pasang sekarang" })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

for (const [width, height, top, bottom, left, right] of [
  [360, 740, 44, 34, 0, 0],
  [390, 844, 59, 34, 0, 0],
  [430, 932, 59, 34, 0, 0],
  [740, 360, 0, 21, 44, 44],
] as const) {
  test(`safe area ${width}x${height}: header, navigasi, dan dialog tetap terjangkau`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: storageFor("athlete"),
      viewport: { width, height },
    });
    try {
      const page = await context.newPage();
      await page.goto("/athlete");
      const menu = page.getByRole("button", { name: /^Menu akun / });
      await expect(menu).toBeVisible();
      await page.evaluate(
        ({ top, bottom, left, right }) => {
          for (const [edge, value] of Object.entries({ top, bottom, left, right })) {
            document.documentElement.style.setProperty(`--safe-area-${edge}`, `${value}px`);
          }
        },
        { top, bottom, left, right },
      );
      expect((await menu.boundingBox())!.y).toBeGreaterThanOrEqual(top);
      const nav = page.getByRole("navigation", { name: "Navigasi utama", exact: true });
      await expect(nav).toHaveCSS("padding-bottom", `${bottom}px`);
      await menu.click();
      await page.getByRole("menuitem", { name: "Pasang TE" }).click();
      const dialog = page.getByRole("dialog", { name: "Pasang TE" });
      await expect(dialog).toBeVisible();
      await dialog.evaluate(async () => {
        await new Promise(requestAnimationFrame);
        document.getAnimations().forEach((animation) => animation.finish());
      });
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(left + 15);
      expect(box.x + box.width).toBeLessThanOrEqual(width - right - 15);
      expect(box.y).toBeGreaterThanOrEqual(top + 15);
      expect(box.y + box.height).toBeLessThanOrEqual(height - bottom - 15);
      await dialog.getByRole("button", { name: "Tutup", exact: true }).last().click();
      await expect(dialog).toBeHidden();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(0);
    } finally {
      await context.close();
    }
  });
}
