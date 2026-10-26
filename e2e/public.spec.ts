import { expect, test } from "@playwright/test";

const PAGES = ["/", "/about", "/programs", "/coaches", "/achievements", "/events", "/contact"];
// Data pribadi dari seed yang tidak boleh muncul di website publik.
const PRIVATE = ["Bima Aditya", "Citra Lestari", "Fajar Nugroho", "ATL-0", "@club.local"];

test.describe("website publik", () => {
  for (const path of PAGES) {
    test(`${path} tampil tanpa data pribadi atlet`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      const html = await page.content();
      for (const word of PRIVATE) expect(html, `bocor: ${word}`).not.toContain(word);
    });
  }

  test("header keamanan terpasang", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
