import type { Metadata } from "next";
import { Suspense } from "react";

import {
  DashboardPlaceholder,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-placeholder";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard Atlet" };

export default function AthletePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AthleteHome />
    </Suspense>
  );
}

async function AthleteHome() {
  const user = await requireRole("ATHLETE");
  return <DashboardPlaceholder title="Dashboard Atlet" user={user} />;
}
