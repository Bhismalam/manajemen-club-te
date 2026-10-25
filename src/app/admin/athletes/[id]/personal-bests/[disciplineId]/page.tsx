import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { DisciplineProgress } from "@/features/personal-bests/discipline-progress";
import { isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { getAthleteDetail } from "@/services/athlete-service";

export const metadata: Metadata = { title: "Progres Personal Best" };

export default function AthleteDisciplineProgressPage({
  params,
}: PageProps<"/admin/athletes/[id]/personal-bests/[disciplineId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({
  params,
}: {
  params: PageProps<"/admin/athletes/[id]/personal-bests/[disciplineId]">["params"];
}) {
  const actor = await requireActor("ADMIN");
  const { id, disciplineId } = await params;
  // getAthleteDetail memeriksa izin lihat atlet (404 di luar scope).
  let athlete;
  try {
    athlete = await getAthleteDetail(actor, id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }
  return (
    <DisciplineProgress athleteId={id} athleteName={athlete.fullName} disciplineId={disciplineId} />
  );
}
