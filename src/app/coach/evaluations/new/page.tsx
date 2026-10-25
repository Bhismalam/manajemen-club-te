import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { EvaluationForm } from "@/features/evaluations/evaluation-form";
import { toClubDateInput } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { listEvaluableAthletes } from "@/services/evaluation-service";

export const metadata: Metadata = { title: "Tulis Evaluasi" };

export default function NewEvaluationPage({ searchParams }: PageProps<"/coach/evaluations/new">) {
  return (
    <>
      <PageHeader
        title="Tulis evaluasi"
        description="Evaluasi langsung bisa dibaca atlet di menu Evaluasi miliknya."
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
  searchParams: PageProps<"/coach/evaluations/new">["searchParams"];
}) {
  const actor = await requireActor("COACH");
  const athletes = await listEvaluableAthletes(actor);
  const { athlete } = await searchParams;

  if (athletes.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Belum ada atlet binaan aktif"
        description="Atlet binaanmu muncul setelah admin memasukkan mereka ke kelompok yang kamu latih."
      />
    );
  }

  const preselected = athletes.find((a) => a.id === athlete)?.id;
  return (
    <EvaluationForm
      basePath="/coach/evaluations"
      athletes={athletes.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        groupName: a.trainingGroup?.name ?? null,
      }))}
      defaults={{
        athleteId: preselected ?? (athletes.length === 1 ? athletes[0]!.id : ""),
        evaluationDate: toClubDateInput(new Date()),
        strengths: "",
        weaknesses: "",
        focus: "",
        target: "",
        notes: "",
      }}
    />
  );
}
