"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { niceTimeTicks } from "@/lib/chart";
import { formatDuration } from "@/lib/duration";

export type ChartPoint = {
  id: string;
  // Tanggal sudah diformat di server (jam klub) agar tidak bergantung zona waktu browser.
  dateLabel: string;
  time: number; // epoch ms, untuk sumbu x
  durationMs: number;
  label: string;
  isPbAtTime: boolean;
};

const HEIGHT = 240;
const PAD = { top: 24, right: 16, bottom: 28, left: 56 };

// Grafik perkembangan waktu satu nomor lomba (satu seri). Sumbu y dibalik: lebih cepat = lebih
// tinggi. Hover / panah kiri-kanan menampilkan detail; tabel di bawah grafik memuat semua angka.
export function ProgressChart({ points, title }: { points: ChartPoint[]; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    if (width === 0 || points.length === 0) return null;
    const times = points.map((p) => p.time);
    const durations = points.map((p) => p.durationMs);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const {
      ticks,
      min: fastest,
      max: slowest,
    } = niceTimeTicks(Math.min(...durations), Math.max(...durations));
    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const x = (t: number) =>
      PAD.left + (maxT === minT ? plotW / 2 : ((t - minT) / (maxT - minT)) * plotW);
    // Dibalik: waktu tercepat di atas.
    const y = (ms: number) => PAD.top + ((ms - fastest) / (slowest - fastest)) * plotH;
    return { x, y, ticks, plotW };
  }, [points, width]);

  const current = points.reduce<ChartPoint | null>(
    (best, p) => (!best || p.durationMs < best.durationMs ? p : best),
    null,
  );

  function nearestIndex(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !geometry) return null;
    const localX = clientX - rect.left;
    let bestIndex = 0;
    points.forEach((p, i) => {
      if (
        Math.abs(geometry.x(p.time) - localX) <
        Math.abs(geometry.x(points[bestIndex]!.time) - localX)
      ) {
        bestIndex = i;
      }
    });
    return bestIndex;
  }

  const activePoint = active !== null ? points[active] : null;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{title}</span>
        <span aria-hidden="true">lebih cepat ↑</span>
      </figcaption>
      <div
        ref={containerRef}
        className="relative h-60 w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
        role="img"
        aria-label={`${title}. ${points.length} hasil. Gunakan panah kiri dan kanan untuk melihat tiap hasil.`}
        onPointerMove={(event) => setActive(nearestIndex(event.clientX))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const step = event.key === "ArrowRight" ? 1 : -1;
          setActive((index) =>
            Math.min(
              points.length - 1,
              Math.max(0, (index ?? (step > 0 ? -1 : points.length)) + step),
            ),
          );
        }}
      >
        {geometry && (
          <svg width={width} height={HEIGHT} className="overflow-visible" aria-hidden="true">
            {geometry.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + geometry.plotW}
                  y1={geometry.y(tick)}
                  y2={geometry.y(tick)}
                  className="stroke-border"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={geometry.y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground font-mono text-[11px]"
                >
                  {formatDuration(tick)}
                </text>
              </g>
            ))}
            <text x={PAD.left} y={HEIGHT - 6} className="fill-muted-foreground text-[11px]">
              {points[0]?.dateLabel}
            </text>
            {points.length > 1 && (
              <text
                x={PAD.left + geometry.plotW}
                y={HEIGHT - 6}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {points.at(-1)?.dateLabel}
              </text>
            )}

            <polyline
              points={points
                .map((p) => `${geometry.x(p.time)},${geometry.y(p.durationMs)}`)
                .join(" ")}
              fill="none"
              className="stroke-primary"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {activePoint && (
              <line
                x1={geometry.x(activePoint.time)}
                x2={geometry.x(activePoint.time)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                className="stroke-muted-foreground/40"
                strokeWidth={1}
              />
            )}

            {points.map((p, i) => (
              <circle
                key={p.id}
                cx={geometry.x(p.time)}
                cy={geometry.y(p.durationMs)}
                r={p.isPbAtTime || i === active ? 5 : 4}
                className={p.isPbAtTime ? "fill-primary stroke-card" : "fill-card stroke-primary"}
                strokeWidth={2}
              />
            ))}

            {current && (
              <text
                x={geometry.x(current.time) - 8}
                y={geometry.y(current.durationMs) - 12}
                textAnchor="end"
                className="fill-foreground font-mono text-xs font-semibold"
              >
                PB {formatDuration(current.durationMs)}
              </text>
            )}
          </svg>
        )}

        {activePoint && geometry && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border bg-popover px-3 py-2 text-xs shadow-sm"
            style={{
              left: Math.min(Math.max(geometry.x(activePoint.time) - 80, 0), width - 160),
              top: 0,
              width: 160,
            }}
          >
            <p className="font-medium">{activePoint.dateLabel}</p>
            <p className="numeric text-sm font-semibold">
              {formatDuration(activePoint.durationMs)}
            </p>
            <p className="truncate text-muted-foreground">
              {activePoint.label}
              {activePoint.isPbAtTime && " · PB saat itu"}
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Titik terisi = PB pada saat itu. Titik kosong = hasil lain.
      </p>
    </figure>
  );
}
