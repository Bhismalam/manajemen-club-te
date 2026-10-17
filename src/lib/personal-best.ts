import type { PersonalBestSource } from "@/generated/prisma/enums";

export type ResultCandidate = {
  durationMs: number;
  achievedAt: Date;
  sourceType: PersonalBestSource;
  sourceId: string;
};

// PB = waktu tercepat dari semua hasil sah. Jika sama cepat, yang tercapai lebih dulu.
export function pickPersonalBest(candidates: ResultCandidate[]): ResultCandidate | null {
  let best: ResultCandidate | null = null;
  for (const candidate of candidates) {
    if (
      !best ||
      candidate.durationMs < best.durationMs ||
      (candidate.durationMs === best.durationMs && candidate.achievedAt < best.achievedAt)
    ) {
      best = candidate;
    }
  }
  return best;
}

export type PbChange = {
  previousMs: number | null;
  currentMs: number | null;
  // PB baru tercipta dari hasil ini (lebih cepat dari PB sebelumnya, atau PB pertama).
  isNewPb: boolean;
};

export function describePbChange(
  previous: { durationMs: number } | null,
  current: { durationMs: number; sourceId: string } | null,
  sourceId: string,
): PbChange {
  return {
    previousMs: previous?.durationMs ?? null,
    currentMs: current?.durationMs ?? null,
    isNewPb:
      current?.sourceId === sourceId &&
      (previous === null || current.durationMs < previous.durationMs),
  };
}

export const RECENT_PB_DAYS = 30;

// PB yang tercapai dalam 30 hari terakhir disorot sebagai "PB baru".
export function isRecentPb(achievedAt: Date, now = new Date(), days = RECENT_PB_DAYS): boolean {
  return now.getTime() - achievedAt.getTime() <= days * 24 * 60 * 60 * 1000;
}

export type ProgressInput = { id: string; date: Date; durationMs: number };

// Urutkan hasil dari terlama dan tandai yang menjadi PB pada saat itu
// (lebih cepat dari semua hasil sebelumnya; hasil pertama selalu PB).
export function markProgression<T extends ProgressInput>(
  results: T[],
): (T & { isPbAtTime: boolean })[] {
  const sorted = [...results].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id),
  );
  let best = Number.POSITIVE_INFINITY;
  return sorted.map((result) => {
    const isPbAtTime = result.durationMs < best;
    if (isPbAtTime) best = result.durationMs;
    return { ...result, isPbAtTime };
  });
}
