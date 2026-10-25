import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { PaginationLinks } from "@/components/shared/pagination-links";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EvaluationRows, NoEvaluations } from "@/features/evaluations/evaluation-card";
import { requireActor } from "@/lib/permissions/actor";
import { evaluationFilterSchema } from "@/lib/validations/evaluations";
import { listEvaluableAthletes, listEvaluations } from "@/services/evaluation-service";

export const metadata: Metadata = { title: "Evaluasi" };

const BASE_PATH = "/coach/evaluations";

export default function CoachEvaluationsPage({ searchParams }: PageProps<"/coach/evaluations">) {
  return (
    <>
      <PageHeader
        title="Evaluasi"
        description="Catatan kekuatan, kekurangan, fokus, dan target untuk atlet binaanmu."
        actions={
          <Link href={`${BASE_PATH}/new`} className={buttonVariants()}>
            <Plus />
            Tulis evaluasi
          </Link>
        }
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
  searchParams: PageProps<"/coach/evaluations">["searchParams"];
}) {
  const actor = await requireActor("COACH");
  const filter = evaluationFilterSchema.parse(await searchParams);
  const [{ items, total, page, pageSize }, athletes] = await Promise.all([
    listEvaluations(actor, filter),
    listEvaluableAthletes(actor),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Atlet</span>
          <NativeSelect name="athlete" defaultValue={filter.athlete}>
            <NativeSelectOption value="">Semua atlet binaan</NativeSelectOption>
            {athletes.map((athlete) => (
              <NativeSelectOption key={athlete.id} value={athlete.id}>
                {athlete.fullName}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <Button type="submit" variant="secondary">
          Tampilkan
        </Button>
      </form>
      {items.length === 0 ? (
        <NoEvaluations
          description={
            athletes.length === 0
              ? "Atlet binaanmu muncul setelah admin memasukkan mereka ke kelompok yang kamu latih."
              : "Tulis evaluasi pertama untuk atlet binaanmu."
          }
        />
      ) : (
        <EvaluationRows evaluations={items} basePath={BASE_PATH} />
      )}
      <PaginationLinks
        basePath={BASE_PATH}
        params={{ athlete: filter.athlete }}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
