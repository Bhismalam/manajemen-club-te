import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { RaceHistory } from "@/features/race-results/race-history";
import { requireActor } from "@/lib/permissions/actor";
import { listAthleteRaceHistory } from "@/services/race-result-service";

export const metadata: Metadata = { title: "Riwayat Lomba" };

export default function AthleteResultsPage() {
  return (
    <>
      <PageHeader
        title="Riwayat lomba"
        description="Hasil lombamu per event. Selisih waktu dibandingkan seed time (PB saat mendaftar)."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const actor = await requireActor("ATHLETE");
  const history = actor.athleteId
    ? await listAthleteRaceHistory(actor.athleteId)
    : { medals: { GOLD: 0, SILVER: 0, BRONZE: 0 }, events: [] };
  return (
    <RaceHistory
      history={history}
      emptyDescription="Hasil lomba yang dicatat pelatih atau admin akan muncul di sini."
    />
  );
}
