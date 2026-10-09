import type { Metadata } from "next";
import { Suspense } from "react";

import {
  DashboardPlaceholder,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-placeholder";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard Pelatih" };

export default function CoachPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CoachHome />
    </Suspense>
  );
}

async function CoachHome() {
  const user = await requireRole("COACH");
  return <DashboardPlaceholder title="Dashboard Pelatih" user={user} />;
}
