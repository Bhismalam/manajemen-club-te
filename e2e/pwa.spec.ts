import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { storageFor } from "./helpers";

async function suppressBrowserInstallPrompt(context: BrowserContext) {
  await context.addInitScript(() => {
    window.addEventListener(
      "beforeinstallprompt",
      (event) => {
        if (event.isTrusted) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
  });
}

async function openInstallDialog(page: Page) {
  await page.getByRole("button", { name: /^Menu akun / }).click();
  await page.getByRole("menuitem", { name: "Pasang TE" }).click();
  await expect(page.getByRole("dialog", { name: "Pasang TE" })).toBeVisible();
}

test("manifest dan ikon dapat diakses tamu; metadata memakai TE", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: "/",
    name: "TE",
    short_name: "TE",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
  });
  for (const icon of manifest.icons) {
    const asset = await request.get(icon.src);
    expect(asset.status()).toBe(200);
    expect(asset.headers()["content-type"]).toContain("image/png");
  }
  await page.goto("/login");
  await expect(page).toHaveTitle("Masuk · TE");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    "TE",
  );
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("viewport-fit=cover");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale=1");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

for (const role of ["admin", "coach", "athlete"] as const) {
  test(`${role} mendapat panduan pemasangan tanpa event browser`, async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageFor(role) });
    try {
      await suppressBrowserInstallPrompt(context);
      const page = await context.newPage();
      await page.goto(`/${role}`);
      await openInstallDialog(page);
      await expect(page.getByRole("dialog")).toContainText("Buka menu browser");
      await expect(page.getByRole("button", { name: "Pasang sekarang" })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
      await expect(page.getByRole("button", { name: /^Menu akun / })).toBeFocused();
    } finally {
      await context.close();
    }
  });
}

for (const outcome of ["accepted", "dismissed", "error"] as const) {
  test(`event pemasangan: ${outcome}, hanya dipanggil lewat klik`, async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageFor("athlete") });
    try {
      await suppressBrowserInstallPrompt(context);
      const page = await context.newPage();
      await page.goto("/athlete");
      await openInstallDialog(page);
      await page.evaluate((outcome) => {
        const event = new Event("beforeinstallprompt", { cancelable: true });
        Object.assign(event, {
          prompt: async () => {
            document.body.dataset.installPrompted = "true";
            if (outcome === "error") throw new Error("Simulated prompt failure");
          },
          userChoice: Promise.resolve({ outcome }),
        });
        window.dispatchEvent(event);
      }, outcome);
      const button = page.getByRole("button", { name: "Pasang sekarang" });
      await expect(button).toBeVisible();
      await expect(page.locator("body")).not.toHaveAttribute("data-install-prompted");
      await button.click();
      const message =
        outcome === "accepted"
          ? "Ikuti proses pemasangan"
          : outcome === "dismissed"
            ? "Pemasangan dibatalkan"
            : "Pemasangan belum berhasil";
      await expect(page.getByRole("dialog")).toContainText(message);
      await expect(button).toHaveCount(0);
      if (outcome === "accepted") {
        await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
        await expect(page.getByRole("dialog")).toContainText("TE sudah terpasang");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
        await page.getByRole("button", { name: /^Menu akun / }).click();
        await expect(page.getByRole("menuitem", { name: "Pasang TE" })).toHaveCount(0);
      }
    } finally {
      await context.close();
    }
  });
}

test("mode standalone tidak menawarkan pemasangan", async ({ browser }) => {
  const context = await browser.newContext({ storageState: storageFor("athlete") });
  try {
    await context.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const media = original(query);
        if (query === "(display-mode: standalone)")
          Object.defineProperty(media, "matches", { value: true });
        return media;
      };
    });
    const page = await context.newPage();
    await page.goto("/athlete");
    await page.getByRole("button", { name: /^Menu akun / }).click();
    await expect(page.getByRole("menuitem", { name: "Pasang TE" })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("indikator koneksi mempertahankan isian login saat offline dan kembali online", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  const email = page.getByLabel("Email", { exact: true });
  await email.fill("anggota@example.test");
  for (let cycle = 0; cycle < 2; cycle++) {
    await context.setOffline(true);
    await expect(page.getByRole("status")).toContainText("Koneksi terputus");
    await expect(email).toHaveValue("anggota@example.test");
    await context.setOffline(false);
    await expect(page.getByText("Koneksi terputus", { exact: true })).toHaveCount(0);
    await expect(email).toHaveValue("anggota@example.test");
  }
});
