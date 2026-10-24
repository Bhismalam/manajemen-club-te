import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { ResultSheetView } from "@/features/race-results/result-sheet-view";
import { requireActor } from "@/lib/permissions/actor";
import { resultSheetFilterSchema } from "@/lib/validations/race-results";

export const metadata: Metadata = { title: "Input Hasil Lomba" };

type Props = PageProps<"/coach/results/[id]">;

export default function ResultSheetPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const actor = await requireActor("COACH");
  const { id } = await params;
  const filter = resultSheetFilterSchema.parse(await searchParams);
  return (
    <ResultSheetView actor={actor} competitionId={id} filter={filter} basePath="/coach/results" />
  );
}
