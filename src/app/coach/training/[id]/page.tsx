import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { SessionDetail } from "@/features/training/session-detail";
import { requireActor } from "@/lib/permissions/actor";

export const metadata: Metadata = { title: "Detail Sesi Latihan" };

export default function TrainingSessionPage({ params }: PageProps<"/coach/training/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/coach/training/[id]">["params"] }) {
  const actor = await requireActor("COACH");
  const { id } = await params;
  return <SessionDetail actor={actor} sessionId={id} basePath="/coach/training" />;
}
