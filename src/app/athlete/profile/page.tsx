import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AthleteSummary } from "@/features/athletes/athlete-summary";
import { AttendanceCountBadges } from "@/features/attendance/attendance-section";
import { SECURITY_SETTINGS_PATH } from "@/lib/auth/routes";
import { requireActor } from "@/lib/permissions/actor";
import { getAthleteDetail } from "@/services/athlete-service";
import { getAthleteAttendanceHistory } from "@/services/attendance-service";

export const metadata: Metadata = { title: "Profil" };

export default function AthleteProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const actor = await requireActor("ATHLETE");
  // athleteId selalu dari session.
  if (!actor.athleteId) notFound();
  const [athlete, attendance] = await Promise.all([
    getAthleteDetail(actor, actor.athleteId),
    getAthleteAttendanceHistory(actor.athleteId, 0),
  ]);

  return (
    <>
      <PageHeader title={athlete.fullName} description="Profil atlet" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Data diri</CardTitle>
            <CardDescription>
              Data ini dikelola admin klub. Hubungi admin atau pelatih jika ada yang perlu diubah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AthleteSummary athlete={athlete} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Kehadiran latihan</CardTitle>
              <CardDescription>
                {attendance.counts.rate === null
                  ? "Belum ada absensi tercatat."
                  : `${attendance.counts.rate}% hadir dari ${attendance.counts.total} sesi tercatat.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceCountBadges counts={attendance.counts} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Keamanan akun</CardTitle>
              <CardDescription>
                Ganti password atau aktifkan verifikasi dua langkah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={SECURITY_SETTINGS_PATH}
                className={buttonVariants({ variant: "outline" })}
              >
                <KeyRound />
                Pengaturan keamanan
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
