import { defineConfig, devices } from "@playwright/test";

import { TEST_DATABASE_URL } from "./e2e/helpers";

// E2E memakai production build di port 3100 dengan database TEST (data seed, di-reset tiap run).
// Browser: Google Chrome terpasang (channel "chrome"). Di CI tanpa Chrome:
// `pnpm exec playwright install chromium` lalu set PW_CHANNEL=chromium.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const channel = process.env.PW_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "e2e",
  // Satu database bersama: test berjalan berurutan.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    locale: "id-ID",
    timezoneId: "Asia/Makassar",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      testIgnore: /mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"], channel },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `${baseURL}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: TEST_DATABASE_URL, BETTER_AUTH_URL: baseURL },
  },
});
