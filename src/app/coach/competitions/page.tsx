import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { CompetitionList } from "@/features/competitions/competition-list";
import { requireActor } from "@/lib/permissions/actor";
import { competitionFilterSchema } from "@/lib/validations/competitions";

export const metadata: Metadata = { title: "Event" };

const BASE_PATH = "/coach/competitions";

export default function CompetitionsPage({ searchParams }: PageProps<"/coach/competitions">) {
  return (
    <>
      <PageHeader
        title="Event"
        description="Event yang dipublikasikan dan draft buatanmu."
        actions={
          <Link href={`${BASE_PATH}/new`} className={buttonVariants()}>
            <Plus />
            Buat event
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
  searchParams: PageProps<"/coach/competitions">["searchParams"];
}) {
  const actor = await requireActor("COACH");
  const filter = competitionFilterSchema.parse(await searchParams);
  return <CompetitionList actor={actor} filter={filter} basePath={BASE_PATH} />;
}
