import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { CompetitionForm } from "@/features/competitions/competition-form";
import { requireActor } from "@/lib/permissions/actor";
import { listCompetitionDisciplineOptions } from "@/services/competition-service";

export const metadata: Metadata = { title: "Buat Event" };

export default function NewCompetitionPage() {
  return (
    <>
      <PageHeader
        title="Buat event"
        description="Event disimpan sebagai draft. Publikasikan setelah PDF dan nomor lomba siap."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireActor("ADMIN");
  const disciplines = await listCompetitionDisciplineOptions();
  return (
    <CompetitionForm
      basePath="/admin/competitions"
      disciplines={disciplines}
      defaults={{
        name: "",
        description: "",
        location: "",
        level: "CLUB",
        startDate: "",
        endDate: "",
        registrationOpensDate: "",
        registrationOpensTime: "08:00",
        registrationClosesDate: "",
        registrationClosesTime: "23:59",
        maxEntriesPerAthlete: "",
        disciplineIds: [],
      }}
    />
  );
}
