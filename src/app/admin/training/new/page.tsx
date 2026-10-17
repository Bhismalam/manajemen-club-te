import { UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { SessionForm } from "@/features/training/session-form";
import { toClubDateInput } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { listManageableGroupOptions } from "@/services/training-session-service";

export const metadata: Metadata = { title: "Buat Sesi Latihan" };

export default function NewTrainingSessionPage() {
  return (
    <>
      <PageHeader
        title="Buat sesi latihan"
        description="Sesi langsung muncul di jadwal atlet kelompok tersebut."
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewSessionContent />
      </Suspense>
    </>
  );
}

async function NewSessionContent() {
  const actor = await requireActor("ADMIN");
  const groups = await listManageableGroupOptions(actor);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Belum ada kelompok yang bisa dijadwalkan"
        description="Buat kelompok latihan dulu di menu Kelompok Latihan."
      />
    );
  }

  return (
    <SessionForm
      basePath="/admin/training"
      groups={groups}
      defaults={{
        trainingGroupId: groups.length === 1 ? groups[0]!.id : "",
        title: "",
        date: toClubDateInput(new Date()),
        startTime: "",
        endTime: "",
        location: "",
        notes: "",
      }}
    />
  );
}
