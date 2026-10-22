import type { DenyReason } from "@/lib/permissions/types";

// Aturan pendaftaran event (fungsi murni). Lihat doc/PRD.md §4.9.2.

const DENY_MESSAGE: Record<DenyReason, string> = {
  FORBIDDEN: "Kamu tidak bisa mendaftarkan atlet ini.",
  ATHLETE_INACTIVE: "Atlet ini tidak aktif sehingga tidak bisa didaftarkan.",
  COMPETITION_NOT_OPEN: "Event ini tidak sedang menerima pendaftaran.",
  REGISTRATION_CLOSED: "Periode pendaftaran sudah ditutup. Hubungi admin untuk perubahan.",
};

export function registrationDenyMessage(reason: DenyReason): string {
  return DENY_MESSAGE[reason];
}

// Nomor lomba yang ditambah / dihapus saat pendaftaran diubah (urutan input dipertahankan).
export function diffDisciplines(current: string[], next: string[]) {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  return {
    added: next.filter((id) => !currentSet.has(id)),
    removed: current.filter((id) => !nextSet.has(id)),
  };
}

export function exceedsEntryLimit(count: number, max: number | null): boolean {
  return max !== null && count > max;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type WindowState =
  | { state: "not_open"; opensAt: Date }
  | { state: "open"; closesAt: Date; label: string }
  | { state: "closed" };

// Keadaan periode pendaftaran untuk label di kartu event, mis. "Tutup 3 hari lagi".
export function registrationWindowState(
  window: { registrationOpensAt: Date | null; registrationClosesAt: Date | null },
  now: Date,
): WindowState {
  const { registrationOpensAt: opensAt, registrationClosesAt: closesAt } = window;
  if (!opensAt || !closesAt || now > closesAt) return { state: "closed" };
  if (now < opensAt) return { state: "not_open", opensAt };

  const remaining = closesAt.getTime() - now.getTime();
  const days = Math.floor(remaining / DAY_MS);
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const label =
    days >= 1
      ? `Tutup ${days} hari lagi`
      : hours >= 1
        ? `Tutup ${hours} jam lagi`
        : "Segera ditutup";
  return { state: "open", closesAt, label };
}

// Urutan peserta per nomor lomba: seed time tercepat dulu, tanpa seed time di akhir (lalu nama).
export function compareSeed(
  a: { seedTimeMs: number | null; name: string },
  b: { seedTimeMs: number | null; name: string },
): number {
  if (a.seedTimeMs !== b.seedTimeMs) {
    if (a.seedTimeMs === null) return 1;
    if (b.seedTimeMs === null) return -1;
    return a.seedTimeMs - b.seedTimeMs;
  }
  return a.name.localeCompare(b.name, "id");
}

type RosterRowLike = {
  athlete: { fullName: string };
  entries: { disciplineId: string; seedTimeMs: number | null }[];
};

// Peserta per nomor lomba (urutan nomor mengikuti event), diurutkan dengan `compareSeed`.
export function groupByDiscipline<D extends { id: string }, R extends RosterRowLike>(
  disciplines: D[],
  rows: R[],
) {
  return disciplines.map((discipline) => ({
    discipline,
    participants: rows
      .flatMap((row) =>
        row.entries
          .filter((entry) => entry.disciplineId === discipline.id)
          .map((entry) => ({ row, seedTimeMs: entry.seedTimeMs, name: row.athlete.fullName })),
      )
      .sort(compareSeed),
  }));
}

// Cegah formula injection saat nilai teks dibuka di Excel/Sheets (doc/SECURITY.md §12.1).
export function escapeSpreadsheetValue(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

// Nama file export, mis. "pendaftar-kejuaraan-renang-2026-2026-10-22.xlsx" (hanya ASCII aman).
export function rosterFileName(eventName: string, date: string, extension: string): string {
  const slug = eventName
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `pendaftar-${slug || "event"}-${date}.${extension}`;
}
