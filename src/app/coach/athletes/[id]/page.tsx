import { ChevronLeft, ClipboardPen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AthleteSummary } from "@/features/athletes/athlete-summary";
import { AttendanceCountBadges } from "@/features/attendance/attendance-section";
import { EvaluationCard, NoEvaluations } from "@/features/evaluations/evaluation-card";
import { PersonalBestGrid } from "@/features/personal-bests/personal-best-card";
import { RaceHistory } from "@/features/race-results/race-history";
import { isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { getAthleteDetail } from "@/services/athlete-service";
import { getAthleteAttendanceHistory } from "@/services/attendance-service";
import { listEvaluations } from "@/services/evaluation-service";
import { listPersonalBests } from "@/services/personal-best-service";
import { listAthleteRaceHistory } from "@/services/race-result-service";

export const metadata: Metadata = { title: "Detail Atlet Binaan" };

export default function CoachAthletePage({ params }: PageProps<"/coach/athletes/[id]">) {
  return (
    <>
      <Link
        href="/coach/athletes"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 self-start" })}
      >
        <ChevronLeft />
        Atlet binaan
      </Link>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function loadAthlete(...args: Parameters<typeof getAthleteDetail>) {
  try {
    return await getAthleteDetail(...args);
  } catch (error) {
    if (isAppError(error) && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")) {
      notFound();
    }
    throw error;
  }
}

async function Content({ params }: { params: PageProps<"/coach/athletes/[id]">["params"] }) {
  const actor = await requireActor("COACH");
  const { id } = await params;
  // Cek izin lihat (atlet binaan) sebelum memuat data lain.
  const athlete = await loadAthlete(actor, id);
  const [pbs, history, evaluations, attendance] = await Promise.all([
    listPersonalBests(id),
    listAthleteRaceHistory(id),
    listEvaluations(actor, { athlete: id, page: 1 }),
    getAthleteAttendanceHistory(id, 0),
  ]);

  return (
    <>
      <PageHeader
        title={athlete.fullName}
        description={`No. atlet ${athlete.athleteNumber} · ${athlete.trainingGroup?.name ?? "Belum punya kelompok"}`}
        actions={
          athlete.isActive ? (
            <Link
              href={`/coach/evaluations/new?athlete=${athlete.id}`}
              className={buttonVariants()}
            >
              <ClipboardPen />
              Tulis evaluasi
            </Link>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Data diri</CardTitle>
            </CardHeader>
            <CardContent>
              <AthleteSummary athlete={athlete} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kehadiran</CardTitle>
              <CardDescription>
                {attendance.counts.rate === null
                  ? "Belum ada absensi tercatat."
                  : `${attendance.counts.rate}% hadir dari ${attendance.counts.total} sesi.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceCountBadges counts={attendance.counts} />
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Personal best</h2>
            <PersonalBestGrid
              pbs={pbs}
              hrefFor={(disciplineId) =>
                `/coach/athletes/${athlete.id}/personal-bests/${disciplineId}`
              }
              emptyDescription="PB muncul setelah ada time trial atau hasil lomba."
            />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Riwayat lomba</h2>
            <RaceHistory history={history} emptyDescription="Belum ada hasil lomba tercatat." />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
              Evaluasi{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({evaluations.total})
              </span>
            </h2>
            {evaluations.items.length === 0 ? (
              <NoEvaluations description="Tulis evaluasi pertama untuk atlet ini." />
            ) : (
              evaluations.items.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  editHref={evaluation.canEdit ? `/coach/evaluations/${evaluation.id}` : undefined}
                />
              ))
            )}
          </section>
        </div>
      </div>
    </>
  );
}
