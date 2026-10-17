import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { PersonalBestGrid } from "@/features/personal-bests/personal-best-card";
import { requireRole } from "@/lib/auth/session";
import { requireActor } from "@/lib/permissions/actor";
import { listPersonalBests } from "@/services/personal-best-service";

export const metadata: Metadata = { title: "Ringkasan" };

export default function AthletePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AthleteOverview />
    </Suspense>
  );
}

async function AthleteOverview() {
  const user = await requireRole("ATHLETE");
  const actor = await requireActor("ATHLETE");
  const pbs = actor.athleteId ? await listPersonalBests(actor.athleteId) : [];
  // Tiga PB terbaru; ringkasan lengkap dashboard menyusul di Phase 13.
  const latest = [...pbs]
    .sort((a, b) => b.achievedAt.getTime() - a.achievedAt.getTime())
    .slice(0, 3);

  return (
    <>
      <PageHeader title={`Halo, ${user.name}`} description="Ringkasan atlet" />
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">PB terbaru</h2>
          {pbs.length > 3 && (
            <Link
              href="/athlete/personal-bests"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Lihat semua ({pbs.length})
            </Link>
          )}
        </div>
        <PersonalBestGrid
          pbs={latest}
          hrefFor={(disciplineId) => `/athlete/personal-bests/${disciplineId}`}
          emptyDescription="PB muncul setelah pelatih mencatat time trial atau hasil lombamu."
        />
      </section>
    </>
  );
}
