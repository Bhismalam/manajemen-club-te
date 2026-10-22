import "server-only";

import ExcelJS from "exceljs";

import { CLUB_TIME_ZONE_LABEL } from "@/lib/format";
import { escapeSpreadsheetValue } from "@/lib/registrations";

import type { RosterExport } from "./roster-data";

type Column = { header: string; width: number };

// Semua nilai teks melewati escapeSpreadsheetValue (formula injection, doc/SECURITY.md §12.1).
function addTable(
  sheet: ExcelJS.Worksheet,
  data: RosterExport,
  title: string,
  columns: Column[],
  rows: (string | number)[][],
) {
  sheet.columns = columns.map((column) => ({ width: column.width }));
  sheet.addRow([escapeSpreadsheetValue(data.event.name)]).font = { bold: true, size: 14 };
  sheet.addRow([
    escapeSpreadsheetValue(`${data.event.dates} · ${data.event.location} · ${data.event.level}`),
  ]);
  sheet.addRow([
    `${title} · ${data.totals.athletes} atlet · ${data.totals.entries} entry · dicetak ${data.generatedAt} ${CLUB_TIME_ZONE_LABEL}`,
  ]).font = { italic: true, color: { argb: "FF5B6B7A" } };
  sheet.addRow([]);

  const header = sheet.addRow(columns.map((column) => column.header));
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F33" } };
  });
  for (const row of rows) {
    sheet.addRow(
      row.map((cell) => (typeof cell === "string" ? escapeSpreadsheetValue(cell) : cell)),
    );
  }

  const headerRow = header.number;
  sheet.views = [{ state: "frozen", ySplit: headerRow }];
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow + rows.length, column: columns.length },
  };
}

export async function buildRosterWorkbook(data: RosterExport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Swim & Finswimming Club";
  workbook.created = new Date();

  addTable(
    workbook.addWorksheet("Per Atlet"),
    data,
    "Per atlet",
    [
      { header: "No", width: 5 },
      { header: "Nama", width: 28 },
      { header: "No. Atlet", width: 14 },
      { header: "JK", width: 5 },
      { header: "Tgl Lahir", width: 13 },
      { header: "Kelompok", width: 18 },
      { header: "Nomor Lomba", width: 40 },
      { header: "Seed Time", width: 24 },
      { header: "Didaftarkan oleh", width: 22 },
      { header: `Waktu Daftar (${CLUB_TIME_ZONE_LABEL})`, width: 22 },
    ],
    data.athletes.map((a) => [
      a.no,
      a.fullName,
      a.athleteNumber,
      a.gender,
      a.birthDate,
      a.group,
      a.entries.map((e) => e.discipline).join("; "),
      a.entries.map((e) => e.seed).join("; "),
      a.registeredBy,
      a.registeredAt,
    ]),
  );

  addTable(
    workbook.addWorksheet("Per Nomor Lomba"),
    data,
    "Per nomor lomba",
    [
      { header: "Nomor Lomba", width: 26 },
      { header: "No", width: 5 },
      { header: "Nama", width: 28 },
      { header: "No. Atlet", width: 14 },
      { header: "JK", width: 5 },
      { header: "Thn Lahir", width: 10 },
      { header: "Kelompok", width: 18 },
      { header: "Seed Time", width: 12 },
    ],
    data.byDiscipline.flatMap((group) =>
      group.participants.map((p) => [
        `${group.name} (${group.poolLength}m)`,
        p.no,
        p.fullName,
        p.athleteNumber,
        p.gender,
        p.birthYear,
        p.group,
        p.seed,
      ]),
    ),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
