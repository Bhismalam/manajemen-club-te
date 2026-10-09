import type { Metadata } from "next";
import { Suspense } from "react";

import {
  DashboardPlaceholder,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-placeholder";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard Admin" };

export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  const user = await requireAdmin();
  return <DashboardPlaceholder title="Dashboard Admin" user={user} />;
}
