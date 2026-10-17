import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { GroupForm } from "@/features/training/group-form";
import { requireActor } from "@/lib/permissions/actor";
import { listCoachOptions } from "@/services/coach-service";

export const metadata: Metadata = { title: "Tambah Kelompok" };

export default function NewGroupPage() {
  return (
    <>
      <PageHeader title="Tambah kelompok latihan" />
      <Suspense fallback={<PageSkeleton />}>
        <NewGroupContent />
      </Suspense>
    </>
  );
}

async function NewGroupContent() {
  await requireActor("ADMIN");
  const coaches = await listCoachOptions();
  return <GroupForm coaches={coaches} defaults={{ name: "", description: "", coachId: "" }} />;
}
