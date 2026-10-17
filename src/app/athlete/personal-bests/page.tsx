import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { PersonalBestGrid } from "@/features/personal-bests/personal-best-card";
import { requireActor } from "@/lib/permissions/actor";
import { listPersonalBests } from "@/services/personal-best-service";

export const metadata: Metadata = { title: "Personal Best" };

export default function MyPersonalBestsPage() {
  return (
    <>
      <PageHeader
        title="Personal best"
        description="Waktu terbaikmu di tiap nomor lomba, dari time trial dan lomba."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const actor = await requireActor("ATHLETE");
  const pbs = actor.athleteId ? await listPersonalBests(actor.athleteId) : [];
  return (
    <PersonalBestGrid
      pbs={pbs}
      hrefFor={(disciplineId) => `/athlete/personal-bests/${disciplineId}`}
      emptyDescription="PB muncul setelah pelatih mencatat time trial atau hasil lombamu."
    />
  );
}
