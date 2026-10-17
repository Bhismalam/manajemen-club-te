import { ShieldUser, UserCog, Users, Waves } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { getUserCounts } from "@/services/user-admin-service";

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
  const counts = await getUserCounts();

  return (
    <>
      <PageHeader title={`Halo, ${user.name}`} description="Ringkasan klub" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Atlet aktif" value={counts.athletes} icon={Users} href="/admin/athletes" />
        <StatCard
          label="Pelatih aktif"
          value={counts.coaches}
          icon={UserCog}
          href="/admin/coaches"
        />
        <StatCard
          label="Kelompok latihan"
          value={counts.groups}
          icon={Waves}
          href="/admin/groups"
        />
        <StatCard
          label="Akun nonaktif"
          value={counts.inactiveUsers}
          icon={ShieldUser}
          href="/admin/users?status=INACTIVE"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Jadwal latihan, event terdekat, dan pendaftaran event akan tampil di sini setelah fiturnya
        tersedia.
      </p>
    </>
  );
}
