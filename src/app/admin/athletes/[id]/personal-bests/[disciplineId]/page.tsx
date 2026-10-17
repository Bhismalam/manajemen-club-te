import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { DisciplineProgress } from "@/features/personal-bests/discipline-progress";
import { prisma } from "@/lib/db/prisma";
import { isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { requireAthleteAccess } from "@/lib/permissions/guards";

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
  try {
    await requireAthleteAccess(actor, id, "view");
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }
  const athlete = await prisma.athleteProfile.findUniqueOrThrow({
    where: { id },
    select: { fullName: true },
  });
  return (
    <DisciplineProgress athleteId={id} athleteName={athlete.fullName} disciplineId={disciplineId} />
  );
}
