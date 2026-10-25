import { ChevronLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvaluationCard } from "@/features/evaluations/evaluation-card";
import { EvaluationForm } from "@/features/evaluations/evaluation-form";
import { isAppError } from "@/lib/errors";
import { formatDate, toDateInputValue } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { getEvaluation } from "@/services/evaluation-service";

export const metadata: Metadata = { title: "Detail Evaluasi" };

export default function EvaluationPage({ params }: PageProps<"/coach/evaluations/[id]">) {
  return (
    <>
      <Link
        href="/coach/evaluations"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 self-start" })}
      >
        <ChevronLeft />
        Semua evaluasi
      </Link>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function load(...args: Parameters<typeof getEvaluation>) {
  try {
    return await getEvaluation(...args);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

async function Content({ params }: { params: PageProps<"/coach/evaluations/[id]">["params"] }) {
  const actor = await requireActor("COACH");
  const { id } = await params;
  const evaluation = await load(actor, id);

  return (
    <>
      <PageHeader
        title={`Evaluasi ${evaluation.athlete.fullName}`}
        description={`${formatDate(evaluation.evaluationDate)} · oleh ${evaluation.coach.fullName}`}
      />
      {evaluation.canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Ubah evaluasi</CardTitle>
          </CardHeader>
          <CardContent>
            <EvaluationForm
              evaluationId={evaluation.id}
              athleteName={evaluation.athlete.fullName}
              basePath="/coach/evaluations"
              defaults={{
                athleteId: evaluation.athlete.id,
                evaluationDate: toDateInputValue(evaluation.evaluationDate),
                strengths: evaluation.strengths,
                weaknesses: evaluation.weaknesses,
                focus: evaluation.focus,
                target: evaluation.target,
                notes: evaluation.notes ?? "",
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Evaluasi ini ditulis pelatih lain, jadi hanya bisa dibaca.
          </p>
          <EvaluationCard evaluation={evaluation} />
        </>
      )}
    </>
  );
}
