import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AthleteDashboard } from "@/features/dashboard/athlete-dashboard";
import { requireRole } from "@/lib/auth/session";
import { requireActor } from "@/lib/permissions/actor";

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
  return <AthleteDashboard actor={actor} name={user.name} />;
}
