import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { ResultEventList } from "@/features/race-results/result-event-list";
import { requireActor } from "@/lib/permissions/actor";

export const metadata: Metadata = { title: "Hasil Lomba" };

export default function ResultsPage() {
  return (
    <>
      <PageHeader title="Hasil lomba" description="Catat hasil lomba atlet binaanmu." />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const actor = await requireActor("COACH");
  return <ResultEventList actor={actor} basePath="/coach/results" />;
}
