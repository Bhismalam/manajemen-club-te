import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { CreateUserForm } from "@/features/users/create-user-form";
import { requireAdmin } from "@/lib/auth/session";
import { ROLE_VALUES } from "@/lib/validations/common";
import { listTrainingGroupOptions } from "@/services/training-group-service";

export const metadata: Metadata = { title: "Tambah Pengguna" };

export default function NewUserPage({ searchParams }: PageProps<"/admin/users/new">) {
  return (
    <>
      <PageHeader
        title="Tambah pengguna"
        description="Akun pelatih dan atlet dibuat bersama profilnya. Password awal dibuat otomatis."
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewUserContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewUserContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/users/new">["searchParams"];
}) {
  await requireAdmin();
  const { role } = await searchParams;
  const initialRole = ROLE_VALUES.find((value) => value === role) ?? "ATHLETE";
  const groups = await listTrainingGroupOptions();
  return <CreateUserForm groups={groups} initialRole={initialRole} />;
}
