import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { requireRole } from "@/lib/auth/session";

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
  return (
    <>
      <PageHeader title={`Halo, ${user.name}`} description="Ringkasan pelatih" />
      <EmptyState
        icon={LayoutDashboard}
        title="Ringkasan sedang disiapkan"
        description="Latihan hari ini, atlet binaan, time trial terbaru, dan PB baru akan tampil di sini."
      />
    </>
  );
}
