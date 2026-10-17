// Tick sumbu waktu yang "bulat" (kelipatan 0.1s, 0.2s, 0.25s, 0.5s, 1s, 2s, 5s, ...),
// mencakup seluruh data, kira-kira `target` garis.
const STEPS_MS = [100, 200, 250, 500, 1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000];

export function niceTimeTicks(minMs: number, maxMs: number, target = 4) {
  const range = Math.max(maxMs - minMs, 100);
  const step = STEPS_MS.find((s) => range / s <= target) ?? STEPS_MS.at(-1)!;
  const start = Math.floor(minMs / step) * step;
  const end = Math.ceil(maxMs / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end; value += step) ticks.push(value);
  // Satu data saja / data tepat di garis: beri ruang satu langkah di kedua sisi.
  if (ticks.length < 2)
    return { ticks: [start - step, start, start + step], min: start - step, max: start + step };
  return { ticks, min: start, max: end };
}
