import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { TimeTrialList } from "@/features/time-trials/time-trial-list";
import { requireActor } from "@/lib/permissions/actor";
import { timeTrialFilterSchema } from "@/lib/validations/time-trials";
import { listDisciplineOptions, listRecordableAthletes } from "@/services/time-trial-service";

export const metadata: Metadata = { title: "Time Trial" };

const BASE_PATH = "/admin/time-trials";

export default function TimeTrialsPage({ searchParams }: PageProps<"/admin/time-trials">) {
  return (
    <>
      <PageHeader
        title="Time trial"
        description="Semua time trial atlet klub. PB diperbarui otomatis."
        actions={
          <Link href={`${BASE_PATH}/new`} className={buttonVariants()}>
            <Plus />
            Catat time trial
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
  searchParams: PageProps<"/admin/time-trials">["searchParams"];
}) {
  const actor = await requireActor("ADMIN");
  const filter = timeTrialFilterSchema.parse(await searchParams);
  const [athletes, disciplines] = await Promise.all([
    listRecordableAthletes(actor),
    listDisciplineOptions(),
  ]);
  return (
    <TimeTrialList
      actor={actor}
      filter={filter}
      athletes={athletes}
      disciplines={disciplines}
      basePath={BASE_PATH}
      detailBasePath={BASE_PATH}
    />
  );
}
