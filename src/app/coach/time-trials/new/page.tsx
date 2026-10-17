import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { RecordTimeTrialsForm } from "@/features/time-trials/record-time-trials-form";
import { toClubDateInput } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import {
  listDisciplineOptions,
  listRecentSessionOptions,
  listRecordableAthletes,
} from "@/services/time-trial-service";

export const metadata: Metadata = { title: "Catat Time Trial" };

export default function NewTimeTrialsPage() {
  return (
    <>
      <PageHeader
        title="Catat time trial"
        description="Satu nomor lomba untuk beberapa atlet sekaligus. PB baru langsung ditandai."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const actor = await requireActor("COACH");
  const [athletes, disciplines, sessions] = await Promise.all([
    listRecordableAthletes(actor),
    listDisciplineOptions(),
    listRecentSessionOptions(actor),
  ]);

  if (athletes.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Belum ada atlet yang bisa dicatat"
        description="Atlet binaanmu muncul setelah admin memasukkan mereka ke kelompok yang kamu latih."
      />
    );
  }

  return (
    <RecordTimeTrialsForm
      athletes={athletes}
      disciplines={disciplines}
      sessions={sessions}
      today={toClubDateInput(new Date())}
      basePath="/coach/time-trials"
    />
  );
}
