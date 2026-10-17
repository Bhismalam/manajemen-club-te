import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AttendanceSummary } from "@/features/attendance/attendance-summary";
import { requireActor } from "@/lib/permissions/actor";
import { attendanceSummaryFilterSchema } from "@/lib/validations/attendance";
import { listManageableGroupOptions } from "@/services/training-session-service";

export const metadata: Metadata = { title: "Absensi" };

export default function AttendancePage({ searchParams }: PageProps<"/admin/attendance">) {
  return (
    <>
      <PageHeader
        title="Absensi"
        description="Rekap kehadiran semua kelompok. Catat absensi dari halaman detail sesi latihan."
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
  searchParams: PageProps<"/admin/attendance">["searchParams"];
}) {
  const actor = await requireActor("ADMIN");
  const filter = attendanceSummaryFilterSchema.parse(await searchParams);
  const groups = await listManageableGroupOptions(actor);
  return (
    <AttendanceSummary
      actor={actor}
      filter={filter}
      groups={groups}
      basePath="/admin/attendance"
      trainingBasePath="/admin/training"
    />
  );
}
