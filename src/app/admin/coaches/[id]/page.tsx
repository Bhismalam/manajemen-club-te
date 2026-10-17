import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { USER_STATUS_LABEL } from "@/constants/labels";
import { CoachProfileForm } from "@/features/coaches/coach-profile-form";
import { userStatusTone } from "@/features/users/user-status";
import { isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { getCoachDetail } from "@/services/coach-service";

export const metadata: Metadata = { title: "Detail Pelatih" };

export default function CoachDetailPage({ params }: PageProps<"/admin/coaches/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CoachDetail params={params} />
    </Suspense>
  );
}

async function loadCoach(id: string) {
  try {
    return await getCoachDetail(id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

async function CoachDetail({ params }: { params: PageProps<"/admin/coaches/[id]">["params"] }) {
  await requireActor("ADMIN");
  const { id } = await params;
  const coach = await loadCoach(id);
  const athleteCount = coach.trainingGroups.reduce((sum, group) => sum + group._count.athletes, 0);

  return (
    <>
      <PageHeader title={coach.fullName} description={coach.specialization ?? "Pelatih"} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge tone={coach.isActive ? "success" : "neutral"}>
                  {coach.isActive ? "Aktif" : "Nonaktif"}
                </StatusBadge>
              </dd>
              <dt className="text-muted-foreground">Atlet binaan</dt>
              <dd className="numeric">{athleteCount}</dd>
              <dt className="text-muted-foreground">Telepon</dt>
              <dd>{coach.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">Akun</dt>
              <dd className="flex flex-col gap-1">
                <Link
                  href={`/admin/users/${coach.userId}`}
                  className="break-all text-primary underline-offset-4 hover:underline"
                >
                  {coach.user.email}
                </Link>
                <StatusBadge tone={userStatusTone(coach.user.status)}>
                  Login {USER_STATUS_LABEL[coach.user.status].toLowerCase()}
                </StatusBadge>
              </dd>
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profil pelatih</CardTitle>
              <CardDescription>Perubahan nama juga mengubah nama akun login.</CardDescription>
            </CardHeader>
            <CardContent>
              <CoachProfileForm
                defaults={{
                  coachId: coach.id,
                  fullName: coach.fullName,
                  phone: coach.phone ?? "",
                  specialization: coach.specialization ?? "",
                  isActive: coach.isActive,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kelompok yang dibina</CardTitle>
              <CardDescription>Atur pelatih kelompok di menu Kelompok Latihan.</CardDescription>
            </CardHeader>
            <CardContent>
              {coach.trainingGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum membina kelompok mana pun.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {coach.trainingGroups.map((group) => (
                    <li key={group.id} className="flex items-center justify-between py-2">
                      <Link
                        href={`/admin/groups/${group.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {group.name}
                      </Link>
                      <span className="text-muted-foreground">
                        <span className="numeric">{group._count.athletes}</span> atlet
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
