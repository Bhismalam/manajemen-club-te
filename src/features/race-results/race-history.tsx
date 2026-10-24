import { History } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { MEDAL_LABEL, ROUND_LABEL } from "@/constants/labels";
import type { Medal } from "@/generated/prisma/enums";
import { formatDelta, formatDuration } from "@/lib/duration";
import { seedDelta } from "@/lib/race-results";
import { cn } from "@/lib/utils";
import type { listAthleteRaceHistory } from "@/services/race-result-service";

import { eventDateRange } from "@/features/competition-registrations/event-summary";

type History = Awaited<ReturnType<typeof listAthleteRaceHistory>>;

export const MEDAL_CLASS: Record<Exclude<Medal, "NONE">, string> = {
  GOLD: "bg-gold/15 text-gold",
  SILVER: "bg-silver/15 text-silver",
  BRONZE: "bg-bronze/15 text-bronze",
};

function MedalTally({ medals }: { medals: History["medals"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["GOLD", "SILVER", "BRONZE"] as const).map((medal) => (
        <span
          key={medal}
          className={cn("rounded-full px-3 py-1 text-sm font-medium", MEDAL_CLASS[medal])}
        >
          {MEDAL_LABEL[medal]} <span className="numeric">{medals[medal]}</span>
        </span>
      ))}
    </div>
  );
}

// Riwayat lomba satu atlet: per event, tiap nomor & babak, dibandingkan dengan seed time (PB saat
// mendaftar). Dipakai di halaman atlet dan detail atlet admin.
export function RaceHistory({
  history,
  emptyDescription,
}: {
  history: History;
  emptyDescription: string;
}) {
  if (history.events.length === 0) {
    return (
      <EmptyState icon={History} title="Belum ada hasil lomba" description={emptyDescription} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MedalTally medals={history.medals} />
      {history.events.map(({ event, results }) => (
        <section key={event.id} className="rounded-xl border bg-card">
          <header className="border-b px-4 py-3">
            <h3 className="font-semibold">{event.name}</h3>
            <p className="text-sm text-muted-foreground">
              {eventDateRange(event.startDate, event.endDate)} · {event.location}
            </p>
          </header>
          <ul className="divide-y">
            {results.map((result) => {
              const delta = seedDelta(result, result.seedTimeMs);
              return (
                <li
                  key={result.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{result.discipline.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {result.discipline.poolLength}m · {ROUND_LABEL[result.round]}
                    </span>
                    {result.note && (
                      <span className="block text-xs text-muted-foreground">{result.note}</span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    {result.status === "FINISHED" && result.durationMs !== null ? (
                      <span className="numeric font-semibold">
                        {formatDuration(result.durationMs)}
                      </span>
                    ) : (
                      <StatusBadge tone="neutral">{result.status}</StatusBadge>
                    )}
                    {delta !== null && (
                      <span
                        className={cn(
                          "numeric text-xs",
                          delta < 0 ? "text-success" : "text-muted-foreground",
                        )}
                        title="Dibanding seed time (PB saat mendaftar)"
                      >
                        {formatDelta(delta)}
                      </span>
                    )}
                    {result.rank !== null && (
                      <span className="text-muted-foreground">#{result.rank}</span>
                    )}
                    {result.medal !== "NONE" && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          MEDAL_CLASS[result.medal],
                        )}
                      >
                        {MEDAL_LABEL[result.medal]}
                      </span>
                    )}
                    {result.isCurrentPb && <StatusBadge tone="success">PB</StatusBadge>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
