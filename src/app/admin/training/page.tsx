import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { SessionList } from "@/features/training/session-list";
import { requireActor } from "@/lib/permissions/actor";
import { trainingSessionFilterSchema } from "@/lib/validations/training";
import { listManageableGroupOptions } from "@/services/training-session-service";

export const metadata: Metadata = { title: "Latihan" };

const BASE_PATH = "/admin/training";

export default function TrainingPage({ searchParams }: PageProps<"/admin/training">) {
  return (
    <>
      <PageHeader
        title="Latihan"
        description="Jadwal latihan semua kelompok."
        actions={
          <Link href={`${BASE_PATH}/new`} className={buttonVariants()}>
            <Plus />
            Buat sesi
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <TrainingContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TrainingContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/training">["searchParams"];
}) {
  const actor = await requireActor("ADMIN");
  const filter = trainingSessionFilterSchema.parse(await searchParams);
  const groups = await listManageableGroupOptions(actor);
  return <SessionList actor={actor} filter={filter} groups={groups} basePath={BASE_PATH} />;
}
