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
