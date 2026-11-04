import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";

import { SppBoard } from "@/features/spp/spp-board";
import { requireActor } from "@/lib/permissions/actor";
import { sppBoardFilterSchema } from "@/lib/validations/spp";
import { listManageableGroupOptions } from "@/services/training-session-service";

export const metadata: Metadata = { title: "SPP" };

export default function SppPage({ searchParams }: PageProps<"/coach/spp">) {
  return (
    <>
      <PageHeader title="SPP" description="Status pembayaran SPP atlet binaan per bulan." />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/coach/spp">["searchParams"];
}) {
  const actor = await requireActor("COACH");
  const filter = sppBoardFilterSchema.parse(await searchParams);
  const groups = await listManageableGroupOptions(actor);
  return (
    <>
      <SppBoard actor={actor} filter={filter} groups={groups} basePath="/coach/spp" />
    </>
  );
}
