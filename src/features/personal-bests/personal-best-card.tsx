import { Award } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PersonalBestSource, SportType } from "@/generated/prisma/enums";
import { formatDuration } from "@/lib/duration";
import { formatClubDate } from "@/lib/format";
import { isRecentPb } from "@/lib/personal-best";

export type PersonalBestCardData = {
  id: string;
  durationMs: number;
  achievedAt: Date;
  sourceType: PersonalBestSource;
  discipline: { id: string; name: string; sportType: SportType; poolLength: number };
};

const SPORT_LABEL: Record<SportType, string> = { SWIMMING: "Renang", FINSWIMMING: "Finswimming" };

export function PersonalBestCard({
  pb,
  href,
  now = new Date(),
}: {
  pb: PersonalBestCardData;
  href: string;
  now?: Date;
}) {
  const recent = isRecentPb(pb.achievedAt, now);
  return (
    <Link
      href={href}
      className={`flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring ${recent ? "border-success/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{pb.discipline.name}</p>
          <p className="text-xs text-muted-foreground">Kolam {pb.discipline.poolLength}m</p>
        </div>
        {recent && <StatusBadge tone="success">PB baru</StatusBadge>}
      </div>
      <p className="numeric text-3xl font-semibold">{formatDuration(pb.durationMs)}</p>
      <p className="text-xs text-muted-foreground">
        {formatClubDate(pb.achievedAt)} · {pb.sourceType === "COMPETITION" ? "Lomba" : "Time trial"}
      </p>
    </Link>
  );
}

// PB dikelompokkan per jenis olahraga. `hrefFor` membuat link ke halaman progres.
export function PersonalBestGrid({
  pbs,
  hrefFor,
  emptyDescription,
}: {
  pbs: PersonalBestCardData[];
  hrefFor: (disciplineId: string) => string;
  emptyDescription: string;
}) {
  if (pbs.length === 0) {
    return (
      <EmptyState icon={Award} title="Belum ada personal best" description={emptyDescription} />
    );
  }

  const now = new Date();
  const sports = [...new Set(pbs.map((pb) => pb.discipline.sportType))];
  return (
    <div className="flex flex-col gap-6">
      {sports.map((sport) => (
        <section key={sport} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{SPORT_LABEL[sport]}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pbs
              .filter((pb) => pb.discipline.sportType === sport)
              .map((pb) => (
                <PersonalBestCard key={pb.id} pb={pb} href={hrefFor(pb.discipline.id)} now={now} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
