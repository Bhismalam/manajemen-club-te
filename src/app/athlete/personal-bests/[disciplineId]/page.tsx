import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { DisciplineProgress } from "@/features/personal-bests/discipline-progress";
import { requireActor } from "@/lib/permissions/actor";

export const metadata: Metadata = { title: "Progres Personal Best" };

export default function MyDisciplineProgressPage({
  params,
}: PageProps<"/athlete/personal-bests/[disciplineId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({
  params,
}: {
  params: PageProps<"/athlete/personal-bests/[disciplineId]">["params"];
}) {
  const actor = await requireActor("ATHLETE");
  if (!actor.athleteId) notFound();
  const { disciplineId } = await params;
  // athleteId selalu dari session, tidak dari URL.
  return (
    <DisciplineProgress
      athleteId={actor.athleteId}
      athleteName={null}
      disciplineId={disciplineId}
    />
  );
}
