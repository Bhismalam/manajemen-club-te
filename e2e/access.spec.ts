import { expect, test, type Browser } from "@playwright/test";

import { sql, storageFor } from "./helpers";

// Matriks akses per role (RBAC) + akses ke data milik pihak lain (IDOR).
type Role = "admin" | "coach" | "athlete" | null;

async function landingPath(browser: Browser, role: Role, path: string) {
  const context = await browser.newContext(role ? { storageState: storageFor(role) } : {});
  const page = await context.newPage();
  await page.goto(path);
  // Redirect di dalam Suspense terjadi setelah streaming: tunggu sampai URL stabil.
  let previous = "";
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    if (page.url() === previous && i > 3) break;
    previous = page.url();
  }
  const url = new URL(page.url()).pathname;
  const notFound = await page.getByText("Halaman tidak ditemukan").count();
  await context.close();
  return notFound > 0 ? "404" : url;
}

const otherAthleteId = () =>
  sql(
    `select a.id from athlete_profile a join "user" u on u.id=a."userId" where u.email='atlet3@club.local'`,
  );
const ownAthleteId = () =>
  sql(
    `select a.id from athlete_profile a join "user" u on u.id=a."userId" where u.email='atlet1@club.local'`,
  );

test.describe("RBAC", () => {
  const cases: [Role, string, string][] = [
    [null, "/admin", "/login"],
    [null, "/coach", "/login"],
    [null, "/athlete", "/login"],
    [null, "/settings/security", "/login"],
    ["athlete", "/admin", "/athlete"],
    ["athlete", "/admin/users", "/athlete"],
    ["athlete", "/coach/athletes", "/athlete"],
    ["coach", "/admin", "/coach"],
    ["coach", "/admin/users", "/coach"],
    ["coach", "/athlete", "/coach"],
    ["admin", "/coach", "/admin"],
    ["admin", "/athlete", "/admin"],
  ];
  for (const [role, path, expected] of cases) {
    test(`${role ?? "tamu"} membuka ${path} → ${expected}`, async ({ browser }) => {
      expect(await landingPath(browser, role, path)).toBe(expected);
    });
  }
});

test.describe("IDOR", () => {
  test("pelatih tidak bisa membuka atlet yang bukan binaannya", async ({ browser }) => {
    expect(await landingPath(browser, "coach", `/coach/athletes/${otherAthleteId()}`)).toBe("404");
    const own = ownAthleteId();
    expect(await landingPath(browser, "coach", `/coach/athletes/${own}`)).toBe(
      `/coach/athletes/${own}`,
    );
  });

  test("event DRAFT tidak terlihat atlet; PDF-nya tidak bisa diunduh", async ({ browser }) => {
    const draftId = "e2e-draft-event";
    sql(
      `insert into competition (id,name,location,"startDate","endDate",level,status,"createdById","updatedAt") values ('${draftId}','Draft Rahasia','x','2027-01-10','2027-01-10','CLUB','DRAFT',(select id from "user" where email='coach.rina@club.local'),now()) on conflict do nothing`,
    );
    expect(await landingPath(browser, "athlete", `/athlete/events/${draftId}`)).toBe("404");
    const context = await browser.newContext({ storageState: storageFor("athlete") });
    const res = await context.request.get(`/api/competitions/${draftId}/attachment`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(404);
    await context.close();
  });

  test("pelatih tidak bisa memakai export rekap admin", async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageFor("coach") });
    const res = await context.request.get(
      "/api/admin/competitions/x/registrations/export?format=xlsx",
      { maxRedirects: 0 },
    );
    expect(res.status()).toBe(307);
    expect(res.headers().location).toMatch(/\/coach$/);
    await context.close();
  });
});
