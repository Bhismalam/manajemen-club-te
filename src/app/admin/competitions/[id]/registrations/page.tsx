import { ChevronLeft, ListChecks, Trophy, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPETITION_STATUS_LABEL } from "@/constants/labels";
import { eventDateRange } from "@/features/competition-registrations/event-summary";
import { ExportMenu } from "@/features/competition-registrations/export-menu";
import { MarkReadOnView } from "@/features/competition-registrations/mark-read-on-view";
import { RegistrationEditor } from "@/features/competition-registrations/registration-editor";
import { RosterView } from "@/features/competition-registrations/roster-view";
import { requireAdmin } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";
import { CLUB_TIME_ZONE_LABEL, formatDateTime } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { rosterFilterSchema } from "@/lib/validations/registrations";
import { getRegistrationBoard, getRoster } from "@/services/competition-registration-service";

export const metadata: Metadata = { title: "Pendaftar Event" };

type Props = PageProps<"/admin/competitions/[id]/registrations">;

export default function RegistrationsPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function load<T>(promise: Promise<T>) {
  try {
    return await promise;
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

async function Content({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  await requireAdmin();
  const actor = await requireActor("ADMIN");
  const { id } = await params;
  const search = await searchParams;
  const filter = rosterFilterSchema.parse(search);
  const selectedAthlete = typeof search.athlete === "string" ? search.athlete : undefined;
  const now = new Date();

  const [roster, board] = await Promise.all([
    load(getRoster(actor, id, filter)),
    load(getRegistrationBoard(actor, id, now)),
  ]);
  const { competition, summary } = roster;
  const basePath = `/admin/competitions/${id}/registrations`;
  const openDisciplines = Object.keys(summary.perDiscipline).length;
  const canEdit = competition.status === "UPCOMING" || competition.status === "ONGOING";

  return (
    <>
      <MarkReadOnView competitionId={id} />
      <Link
        href={`/admin/competitions/${id}`}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 self-start" })}
      >
        <ChevronLeft />
        Detail event
      </Link>
      <PageHeader
        title={`Pendaftar · ${competition.name}`}
        description={`${eventDateRange(competition.startDate, competition.endDate)} · ${competition.location} · deadline ${
          competition.registrationClosesAt
            ? `${formatDateTime(competition.registrationClosesAt)} ${CLUB_TIME_ZONE_LABEL}`
            : "belum diatur"
        }`}
        actions={<ExportMenu competitionId={id} disabled={summary.athletes === 0} />}
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total atlet" value={summary.athletes} icon={Users} />
        <StatCard label="Total entry" value={summary.entries} icon={ListChecks} />
        <StatCard
          label={`Nomor terisi (dari ${competition.disciplines.length})`}
          value={openDisciplines}
          icon={Trophy}
        />
      </div>

      <RosterView roster={roster} filter={filter} basePath={basePath} />

      <Card id="kelola" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Daftarkan / ubah pendaftaran atlet</CardTitle>
          <CardDescription>
            Admin bisa mengubah atau membatalkan pendaftaran kapan saja selama event belum selesai,
            termasuk setelah deadline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationEditor
            key={selectedAthlete ?? "default"}
            competitionId={id}
            disciplines={competition.disciplines}
            athletes={board.athletes}
            mode="managed"
            canEdit={canEdit}
            closedMessage={`Event berstatus ${COMPETITION_STATUS_LABEL[competition.status]}, pendaftaran tidak bisa diubah.`}
            maxEntries={competition.maxEntriesPerAthlete}
            initialAthleteId={selectedAthlete}
          />
        </CardContent>
      </Card>
    </>
  );
}
