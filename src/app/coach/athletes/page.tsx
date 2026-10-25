import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isEvaluationDue } from "@/lib/evaluations";
import { ageOn, formatDate } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { listCoachAthletes } from "@/services/athlete-service";

export const metadata: Metadata = { title: "Atlet Binaan" };

export default function CoachAthletesPage({ searchParams }: PageProps<"/coach/athletes">) {
  return (
    <>
      <PageHeader title="Atlet binaan" description="Atlet di kelompok latihan yang kamu latih." />
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/coach/athletes">["searchParams"];
}) {
  const actor = await requireActor("COACH");
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const athletes = await listCoachAthletes(actor, query);
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex gap-2">
        <label className="sr-only" htmlFor="q">
          Cari nama atau nomor atlet
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="Cari nama atau nomor atlet"
          className="sm:max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Cari
        </Button>
        {query && (
          <Link href="/coach/athletes" className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        )}
      </form>

      {athletes.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "Tidak ada atlet yang cocok" : "Belum ada atlet binaan"}
          description={
            query
              ? "Ubah kata kunci."
              : "Atlet binaanmu muncul setelah admin memasukkan mereka ke kelompok yang kamu latih."
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {athletes.map((athlete) => {
            const due = athlete.isActive && isEvaluationDue(athlete.lastEvaluationDate, now);
            return (
              <li key={athlete.id}>
                <Link
                  href={`/coach/athletes/${athlete.id}`}
                  className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted sm:flex-row sm:items-center sm:gap-6"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {athlete.fullName}
                      {!athlete.isActive && <StatusBadge tone="neutral">Nonaktif</StatusBadge>}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {athlete.athleteNumber} · {ageOn(athlete.birthDate)} th ·{" "}
                      {athlete.trainingGroup?.name ?? "—"}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      <span className="numeric">{athlete._count.personalBests}</span> PB
                    </span>
                    {due ? (
                      <StatusBadge tone="warning">
                        {athlete.lastEvaluationDate ? "Perlu evaluasi" : "Belum dievaluasi"}
                      </StatusBadge>
                    ) : (
                      <span>Evaluasi {formatDate(athlete.lastEvaluationDate)}</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
