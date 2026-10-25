import type { Metadata } from "next";

import { CtaBand, MedalCounts, PageIntro, Section } from "@/components/public/public-blocks";
import { COMPETITION_LEVEL_LABEL } from "@/constants/labels";
import { formatDate } from "@/lib/format";
import { getPublicAchievements } from "@/services/public-service";

export const metadata: Metadata = {
  title: "Prestasi",
  description: "Rekap medali atlet klub di berbagai kejuaraan.",
};

export default async function AchievementsPage() {
  const { totals, events } = await getPublicAchievements();
  return (
    <>
      <PageIntro
        eyebrow="Prestasi"
        title="Medali dari kejuaraan"
        description="Rekap medali seluruh atlet klub per kejuaraan. Nama atlet tidak ditampilkan untuk menjaga privasi atlet muda."
      />
      <Section title="Total medali">
        <MedalCounts counts={totals} size="lg" />
      </Section>
      <div className="bg-card">
        <Section title="Per kejuaraan">
          {events.length === 0 ? (
            <p className="text-muted-foreground">
              Prestasi akan tampil setelah hasil lomba dicatat.
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-2xl border bg-background">
              {events.map((row) => (
                <li
                  key={row.event.id}
                  className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-heading text-lg font-bold">{row.event.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(row.event.startDate)} · {row.event.location} · Tingkat{" "}
                      {COMPETITION_LEVEL_LABEL[row.event.level]}
                    </span>
                  </div>
                  <MedalCounts counts={row} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <CtaBand />
    </>
  );
}
