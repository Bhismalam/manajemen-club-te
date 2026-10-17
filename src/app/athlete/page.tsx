import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { requireRole } from "@/lib/auth/session";

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
  return (
    <>
      <PageHeader title={`Halo, ${user.name}`} description="Ringkasan atlet" />
      <EmptyState
        icon={LayoutDashboard}
        title="Ringkasan sedang disiapkan"
        description="Jadwal latihan berikutnya, personal best, time trial terbaru, dan evaluasi pelatih akan tampil di sini."
      />
    </>
  );
}
