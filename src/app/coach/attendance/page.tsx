import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AttendanceSummary } from "@/features/attendance/attendance-summary";
import { requireActor } from "@/lib/permissions/actor";
import { attendanceSummaryFilterSchema } from "@/lib/validations/attendance";
import { listManageableGroupOptions } from "@/services/training-session-service";

export const metadata: Metadata = { title: "Absensi" };

export default function AttendancePage({ searchParams }: PageProps<"/coach/attendance">) {
  return (
    <>
      <PageHeader
        title="Absensi"
        description="Rekap kehadiran atlet binaan. Catat absensi dari halaman detail sesi latihan."
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
  searchParams: PageProps<"/coach/attendance">["searchParams"];
}) {
  const actor = await requireActor("COACH");
  const filter = attendanceSummaryFilterSchema.parse(await searchParams);
  const groups = await listManageableGroupOptions(actor);
  return (
    <AttendanceSummary
      actor={actor}
      filter={filter}
      groups={groups}
      basePath="/coach/attendance"
      trainingBasePath="/coach/training"
    />
  );
}
