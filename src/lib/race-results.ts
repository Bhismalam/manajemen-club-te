import type { CompetitionStatus, Medal, ResultStatus, Round } from "@/generated/prisma/enums";

// Aturan hasil lomba (fungsi murni). Lihat doc/PRD.md §4.10.

// Hasil boleh dicatat saat event berlangsung / selesai, atau event "akan datang" yang tanggal
// mulainya sudah tiba (admin lupa menandai berlangsung). `today` = tanggal klub "YYYY-MM-DD".
export function canRecordResults(
  competition: { status: CompetitionStatus; startDate: Date },
  today: string,
): boolean {
  if (competition.status === "ONGOING" || competition.status === "COMPLETED") return true;
  return (
    competition.status === "UPCOMING" && competition.startDate.toISOString().slice(0, 10) <= today
  );
}

// Medali hanya dari babak final (final / final langsung), peringkat 1–3.
export function medalForRank(rank: number | null, round: Round): Medal {
  if (round !== "FINAL" && round !== "TIME_FINAL") return "NONE";
  if (rank === 1) return "GOLD";
  if (rank === 2) return "SILVER";
  if (rank === 3) return "BRONZE";
  return "NONE";
}

const STATUS_ORDER: Record<ResultStatus, number> = { FINISHED: 0, DSQ: 1, DNF: 2, DNS: 3 };

// Urutan tampilan hasil: finish tercepat dulu, lalu DSQ, DNF, DNS.
export function compareResults(
  a: { status: ResultStatus; durationMs: number | null },
  b: { status: ResultStatus; durationMs: number | null },
): number {
  if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  return (a.durationMs ?? Number.POSITIVE_INFINITY) - (b.durationMs ?? Number.POSITIVE_INFINITY);
}

// Selisih terhadap seed time (PB saat mendaftar). Negatif = lebih cepat.
export function seedDelta(
  result: { status: ResultStatus; durationMs: number | null },
  seedTimeMs: number | null,
): number | null {
  if (result.status !== "FINISHED" || result.durationMs === null || seedTimeMs === null)
    return null;
  return result.durationMs - seedTimeMs;
}
