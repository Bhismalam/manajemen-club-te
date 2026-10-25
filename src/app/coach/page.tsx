import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { CoachDashboard } from "@/features/dashboard/coach-dashboard";
import { requireRole } from "@/lib/auth/session";
import { requireActor } from "@/lib/permissions/actor";

export const metadata: Metadata = { title: "Ringkasan" };

export default function CoachPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CoachOverview />
    </Suspense>
  );
}

async function CoachOverview() {
  const user = await requireRole("COACH");
  const actor = await requireActor("COACH");
  return (
    <>
      <PageHeader title={`Halo, ${user.name}`} description="Ringkasan pelatih" />
      <CoachDashboard actor={actor} />
    </>
  );
}
