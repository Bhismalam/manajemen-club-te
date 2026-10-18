import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { CompetitionDetail } from "@/features/competitions/competition-detail";
import { requireActor } from "@/lib/permissions/actor";

export const metadata: Metadata = { title: "Detail Event" };

export default function CompetitionPage({ params }: PageProps<"/admin/competitions/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/competitions/[id]">["params"] }) {
  const actor = await requireActor("ADMIN");
  const { id } = await params;
  return <CompetitionDetail actor={actor} competitionId={id} basePath="/admin/competitions" />;
}
