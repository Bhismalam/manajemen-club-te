import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { TimeTrialList } from "@/features/time-trials/time-trial-list";
import { requireActor } from "@/lib/permissions/actor";
import { timeTrialFilterSchema } from "@/lib/validations/time-trials";
import { listDisciplineOptions } from "@/services/time-trial-service";

export const metadata: Metadata = { title: "Time Trial" };

export default function MyTimeTrialsPage({ searchParams }: PageProps<"/athlete/time-trials">) {
  return (
    <>
      <PageHeader title="Time trial" description="Waktu latihanmu yang dicatat pelatih." />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/athlete/time-trials">["searchParams"];
}) {
  const actor = await requireActor("ATHLETE");
  // Filter atlet diabaikan: scope atlet selalu dirinya sendiri.
  const filter = { ...timeTrialFilterSchema.parse(await searchParams), athlete: "" };
  const disciplines = await listDisciplineOptions();
  return (
    <TimeTrialList
      actor={actor}
      filter={filter}
      athletes={null}
      disciplines={disciplines}
      basePath="/athlete/time-trials"
      detailBasePath={null}
    />
  );
}
