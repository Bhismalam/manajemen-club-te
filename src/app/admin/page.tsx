import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminDashboard } from "@/features/dashboard/admin-dashboard";
import { requireAdmin } from "@/lib/auth/session";
import { requireActor } from "@/lib/permissions/actor";

export const metadata: Metadata = { title: "Ringkasan" };

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminOverview />
    </Suspense>
  );
}

async function AdminOverview() {
  const user = await requireAdmin();
  const actor = await requireActor("ADMIN");
  return (
    <>
      <PageHeader title={`Halo, ${user.name}`} description="Ringkasan klub" />
      <AdminDashboard actor={actor} />
    </>
  );
}
