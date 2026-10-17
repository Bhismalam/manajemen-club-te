import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { TimeTrialDetail } from "@/features/time-trials/time-trial-detail";
import { requireActor } from "@/lib/permissions/actor";

export const metadata: Metadata = { title: "Detail Time Trial" };

export default function TimeTrialPage({ params }: PageProps<"/admin/time-trials/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/time-trials/[id]">["params"] }) {
  const actor = await requireActor("ADMIN");
  const { id } = await params;
  return <TimeTrialDetail actor={actor} timeTrialId={id} basePath="/admin/time-trials" />;
}
