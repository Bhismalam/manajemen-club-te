import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/permissions/types";
import { getRoster, saveRegistration } from "@/services/competition-registration-service";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit-service";
import {
  createAdmin,
  createAthlete,
  createCoach,
  createCompetition,
  createDiscipline,
  createGroup,
} from "@/test/factories";

import { toRosterExport } from "./roster-data";
import { renderRosterPdf } from "./roster-pdf";
import { buildRosterWorkbook } from "./roster-xlsx";

describe("export rekap pendaftar", () => {
  let admin: Actor;
  let competitionId: string;

  beforeEach(async () => {
    admin = await createAdmin();
    const coach = await createCoach();
    const group = await createGroup(coach.id, "Junior");
    const [free, back] = await Promise.all([
      createDiscipline({ name: "50m Freestyle" }),
      createDiscipline({ name: "50m Backstroke" }),
    ]);
    const competition = await createCompetition({
      createdById: admin.userId,
      disciplineIds: [free.id, back.id],
      name: "Kejuaraan Ekspor",
    });
    competitionId = competition.id;

    const fast = await createAthlete({ groupId: group.id, name: "Bima Cepat" });
    const slow = await createAthlete({ groupId: group.id, name: "Citra Santai", gender: "FEMALE" });
    // Nama berbahaya: harus tetap teks di Excel, bukan formula.
    const evil = await createAthlete({ groupId: group.id, name: '=HYPERLINK("http://x","klik")' });
    for (const [athlete, ms] of [
      [fast, 30_000],
      [slow, 33_000],
    ] as const) {
      await prisma.personalBest.create({
        data: {
          athleteId: athlete.id,
          disciplineId: free.id,
          durationMs: ms,
          achievedAt: new Date(),
          sourceType: "TIME_TRIAL",
          sourceId: "seed",
        },
      });
    }
    await saveRegistration(coach.actor, {
      competitionId,
      athleteId: slow.id,
      disciplineIds: [free.id],
    });
    await saveRegistration(coach.actor, {
      competitionId,
      athleteId: fast.id,
      disciplineIds: [free.id, back.id],
    });
    await saveRegistration(coach.actor, {
      competitionId,
      athleteId: evil.id,
      disciplineIds: [back.id],
    });
  });

  it("data export: per atlet & per nomor (urut seed time)", async () => {
    const data = toRosterExport(await getRoster(admin, competitionId));
    expect(data.totals).toEqual({ athletes: 3, entries: 4 });
    const freestyle = data.byDiscipline.find((g) => g.name === "50m Freestyle");
    expect(freestyle?.participants.map((p) => [p.fullName, p.seed])).toEqual([
      ["Bima Cepat", "30.00"],
      ["Citra Santai", "33.00"],
    ]);
  });

  it("Excel: 2 sheet, isi sesuai data, nama formula di-escape", async () => {
    const data = toRosterExport(await getRoster(admin, competitionId));
    const workbook = new ExcelJS.Workbook();
    const file = await buildRosterWorkbook(data);
    await workbook.xlsx.load(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer,
    );
    expect(workbook.worksheets.map((s) => s.name)).toEqual(["Per Atlet", "Per Nomor Lomba"]);

    const perAthlete = workbook.getWorksheet("Per Atlet")!;
    const values = (row: number) => (perAthlete.getRow(row).values as unknown[]).slice(1);
    const header = perAthlete.getRow(5);
    expect(header.getCell(2).value).toBe("Nama");
    const rows = [6, 7, 8].map(values);
    const names = rows.map((r) => r[1]);
    expect(names).toContain("Bima Cepat");
    expect(names).toContain(`'=HYPERLINK("http://x","klik")`);
    const bima = rows.find((r) => r[1] === "Bima Cepat")!;
    expect(bima[6]).toBe("50m Freestyle; 50m Backstroke");
    expect(bima[7]).toBe("30.00; —");

    // Tidak ada sel yang berisi formula.
    let formulas = 0;
    workbook.eachSheet((sheet) =>
      sheet.eachRow((row) =>
        row.eachCell((cell) => {
          if (cell.type === ExcelJS.ValueType.Formula) formulas++;
        }),
      ),
    );
    expect(formulas).toBe(0);
  });

  it("PDF: file PDF valid", async () => {
    const data = toRosterExport(await getRoster(admin, competitionId));
    const pdf = await renderRosterPdf(data);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.toString("latin1")).toMatch(/\/Type\s*\/Page\b/);
  });
});

describe("rate limit aksi aplikasi", () => {
  it("menolak permintaan di atas batas, per user, dan reset setelah jendela lewat", async () => {
    const { max, windowSeconds } = RATE_LIMITS.export;
    const now = Date.now();
    for (let i = 0; i < max; i++) await enforceRateLimit("export", "user-a", now);
    await expect(enforceRateLimit("export", "user-a", now)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    // User lain punya kuota sendiri.
    await expect(enforceRateLimit("export", "user-b", now)).resolves.toBeUndefined();
    // Setelah jendela lewat, kuota kembali.
    await expect(
      enforceRateLimit("export", "user-a", now + (windowSeconds + 1) * 1000),
    ).resolves.toBeUndefined();
  });
});
