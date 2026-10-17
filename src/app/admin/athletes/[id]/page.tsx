import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GENDER_LABEL, USER_STATUS_LABEL } from "@/constants/labels";
import { AthleteProfileForm } from "@/features/athletes/athlete-profile-form";
import { PersonalBestGrid } from "@/features/personal-bests/personal-best-card";
import { userStatusTone } from "@/features/users/user-status";
import { isAppError } from "@/lib/errors";
import { ageOn, formatDate, toDateInputValue } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import type { Actor } from "@/lib/permissions/types";
import { getAthleteDetail } from "@/services/athlete-service";
import { listPersonalBests } from "@/services/personal-best-service";
import { listTrainingGroupOptions } from "@/services/training-group-service";

export const metadata: Metadata = { title: "Detail Atlet" };

export default function AthleteDetailPage({ params }: PageProps<"/admin/athletes/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AthleteDetail params={params} />
    </Suspense>
  );
}

async function loadAthlete(actor: Actor, id: string) {
  try {
    return await getAthleteDetail(actor, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

async function AthleteDetail({ params }: { params: PageProps<"/admin/athletes/[id]">["params"] }) {
  const actor = await requireActor("ADMIN");
  const { id } = await params;
  const [athlete, groups, pbs] = await Promise.all([
    loadAthlete(actor, id),
    listTrainingGroupOptions(),
    listPersonalBests(id),
  ]);

  return (
    <>
      <PageHeader
        title={athlete.fullName}
        description={`No. atlet ${athlete.athleteNumber} · ${athlete.trainingGroup?.name ?? "Belum punya kelompok"}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge tone={athlete.isActive ? "success" : "neutral"}>
                  {athlete.isActive ? "Aktif" : "Nonaktif"}
                </StatusBadge>
              </dd>
              <dt className="text-muted-foreground">Umur</dt>
              <dd>
                <span className="numeric">{ageOn(athlete.birthDate)}</span> tahun
                <span className="text-muted-foreground"> · {formatDate(athlete.birthDate)}</span>
              </dd>
              <dt className="text-muted-foreground">Jenis kelamin</dt>
              <dd>{GENDER_LABEL[athlete.gender]}</dd>
              <dt className="text-muted-foreground">Bergabung</dt>
              <dd>{formatDate(athlete.joinDate)}</dd>
              <dt className="text-muted-foreground">Pelatih</dt>
              <dd>
                {athlete.trainingGroup?.coach ? (
                  <Link
                    href={`/admin/coaches/${athlete.trainingGroup.coach.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {athlete.trainingGroup.coach.fullName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Belum ada</span>
                )}
              </dd>
              <dt className="text-muted-foreground">Akun</dt>
              <dd className="flex flex-col gap-1">
                <Link
                  href={`/admin/users/${athlete.userId}`}
                  className="break-all text-primary underline-offset-4 hover:underline"
                >
                  {athlete.user.email}
                </Link>
                <StatusBadge tone={userStatusTone(athlete.user.status)}>
                  Login {USER_STATUS_LABEL[athlete.user.status].toLowerCase()}
                </StatusBadge>
              </dd>
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profil atlet</CardTitle>
              <CardDescription>Perubahan nama juga mengubah nama akun login.</CardDescription>
            </CardHeader>
            <CardContent>
              <AthleteProfileForm
                groups={groups}
                defaults={{
                  athleteId: athlete.id,
                  fullName: athlete.fullName,
                  athleteNumber: athlete.athleteNumber,
                  birthDate: toDateInputValue(athlete.birthDate),
                  joinDate: toDateInputValue(athlete.joinDate),
                  gender: athlete.gender,
                  phone: athlete.phone ?? "",
                  trainingGroupId: athlete.trainingGroupId ?? "",
                  isActive: athlete.isActive,
                }}
              />
            </CardContent>
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Personal best</h2>
            <PersonalBestGrid
              pbs={pbs}
              hrefFor={(disciplineId) =>
                `/admin/athletes/${athlete.id}/personal-bests/${disciplineId}`
              }
              emptyDescription={`${athlete._count.timeTrials} time trial tercatat. PB muncul setelah ada time trial atau hasil lomba.`}
            />
          </section>
        </div>
      </div>
    </>
  );
}
