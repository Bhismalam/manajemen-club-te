import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { requireAdmin } from "@/lib/auth/session";

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
  return (
    <>
      <PageHeader title={`Halo, ${user.name}`} description="Ringkasan klub" />
      <EmptyState
        icon={LayoutDashboard}
        title="Ringkasan sedang disiapkan"
        description="Jumlah atlet dan pelatih, jadwal latihan, event terdekat, dan pendaftaran event baru akan tampil di sini."
      />
    </>
  );
}
