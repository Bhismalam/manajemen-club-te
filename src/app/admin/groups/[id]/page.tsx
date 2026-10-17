import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteGroupButton, GroupForm } from "@/features/training/group-form";
import { isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { listCoachOptions } from "@/services/coach-service";
import { getTrainingGroup } from "@/services/training-group-service";

export const metadata: Metadata = { title: "Detail Kelompok" };

export default function GroupDetailPage({ params }: PageProps<"/admin/groups/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GroupDetail params={params} />
    </Suspense>
  );
}

async function loadGroup(id: string) {
  try {
    return await getTrainingGroup(id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

async function GroupDetail({ params }: { params: PageProps<"/admin/groups/[id]">["params"] }) {
  await requireActor("ADMIN");
  const { id } = await params;
  const [group, coaches] = await Promise.all([loadGroup(id), listCoachOptions()]);

  // Pelatih saat ini tetap muncul di pilihan walau sudah nonaktif, agar form tidak berubah diam-diam.
  const coachOptions =
    group.coach && !coaches.some((coach) => coach.id === group.coach?.id)
      ? [...coaches, { id: group.coach.id, fullName: `${group.coach.fullName} (nonaktif)` }]
      : coaches;

  const blockedReason =
    group.athletes.length > 0
      ? `Masih ada ${group.athletes.length} atlet. Pindahkan ke kelompok lain lewat profil atlet.`
      : group._count.sessions > 0
        ? "Kelompok sudah punya riwayat sesi latihan dan tidak bisa dihapus."
        : null;

  return (
    <>
      <PageHeader
        title={group.name}
        description={group.coach ? `Pelatih: ${group.coach.fullName}` : "Belum ada pelatih"}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Data kelompok</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            <GroupForm
              groupId={group.id}
              coaches={coachOptions}
              defaults={{
                name: group.name,
                description: group.description ?? "",
                coachId: group.coachId ?? "",
              }}
            />
            <DeleteGroupButton
              groupId={group.id}
              groupName={group.name}
              blockedReason={blockedReason}
            />
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Atlet</CardTitle>
            <CardDescription>
              Pindahkan atlet ke kelompok lain dari halaman profil atlet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {group.athletes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada atlet di kelompok ini.</p>
            ) : (
              <ul className="divide-y text-sm">
                {group.athletes.map((athlete) => (
                  <li key={athlete.id} className="flex items-center justify-between gap-4 py-2">
                    <Link
                      href={`/admin/athletes/${athlete.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {athlete.fullName}
                    </Link>
                    <span className="flex items-center gap-3">
                      <span className="numeric text-muted-foreground">{athlete.athleteNumber}</span>
                      {!athlete.isActive && <StatusBadge tone="neutral">Nonaktif</StatusBadge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
