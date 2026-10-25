import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { PaginationLinks } from "@/components/shared/pagination-links";
import { EvaluationCard, NoEvaluations } from "@/features/evaluations/evaluation-card";
import { requireActor } from "@/lib/permissions/actor";
import { evaluationFilterSchema } from "@/lib/validations/evaluations";
import { listEvaluations } from "@/services/evaluation-service";

export const metadata: Metadata = { title: "Evaluasi" };

export default function AthleteEvaluationsPage({
  searchParams,
}: PageProps<"/athlete/evaluations">) {
  return (
    <>
      <PageHeader
        title="Evaluasi pelatih"
        description="Catatan pelatih tentang perkembanganmu, terbaru di atas."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/athlete/evaluations">["searchParams"];
}) {
  const actor = await requireActor("ATHLETE");
  // athleteScope untuk atlet = dirinya sendiri; filter atlet dari URL diabaikan.
  const { page } = evaluationFilterSchema.parse(await searchParams);
  const { items, total, pageSize } = await listEvaluations(actor, { athlete: "", page });

  if (items.length === 0) {
    return <NoEvaluations description="Evaluasi dari pelatihmu akan muncul di sini." />;
  }
  return (
    <div className="flex flex-col gap-4">
      {items.map((evaluation) => (
        <EvaluationCard key={evaluation.id} evaluation={evaluation} />
      ))}
      <PaginationLinks
        basePath="/athlete/evaluations"
        params={{}}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
