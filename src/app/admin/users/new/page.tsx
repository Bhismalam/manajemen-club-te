import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { CreateUserForm } from "@/features/users/create-user-form";
import { requireAdmin } from "@/lib/auth/session";
import { listTrainingGroupOptions } from "@/services/training-group-service";

export const metadata: Metadata = { title: "Tambah Pengguna" };

export default function NewUserPage() {
  return (
    <>
      <PageHeader
        title="Tambah pengguna"
        description="Akun pelatih dan atlet dibuat bersama profilnya. Password awal dibuat otomatis."
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewUserContent />
      </Suspense>
    </>
  );
}

async function NewUserContent() {
  await requireAdmin();
  const groups = await listTrainingGroupOptions();
  return <CreateUserForm groups={groups} />;
}
