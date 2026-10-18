import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPETITION_LEVEL_LABEL } from "@/constants/labels";
import { isEditableStatus } from "@/lib/competitions";
import { isAppError } from "@/lib/errors";
import {
  CLUB_TIME_ZONE_LABEL,
  formatDate,
  formatDateTime,
  toClubDateInput,
  toClubTimeInput,
  toDateInputValue,
} from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import type { CompetitionInput } from "@/lib/validations/competitions";
import { getCompetition, listCompetitionDisciplineOptions } from "@/services/competition-service";

import { AttachmentCard } from "./attachment-card";
import { CompetitionForm } from "./competition-form";
import { CompetitionStatusBadge } from "./competition-status-badge";
import { StatusPanel } from "./status-panel";

type Competition = Awaited<ReturnType<typeof getCompetition>>;

async function loadCompetition(actor: Actor, competitionId: string) {
  try {
    return await getCompetition(actor, competitionId);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

function toFormDefaults(competition: Competition): CompetitionInput {
  const { registrationOpensAt: opens, registrationClosesAt: closes } = competition;
  return {
    name: competition.name,
    description: competition.description ?? "",
    location: competition.location,
    level: competition.level,
    startDate: toDateInputValue(competition.startDate),
    endDate: toDateInputValue(competition.endDate),
    registrationOpensDate: opens ? toClubDateInput(opens) : "",
    registrationOpensTime: opens ? toClubTimeInput(opens) : "08:00",
    registrationClosesDate: closes ? toClubDateInput(closes) : "",
    registrationClosesTime: closes ? toClubTimeInput(closes) : "23:59",
    maxEntriesPerAthlete: competition.maxEntriesPerAthlete?.toString() ?? "",
    disciplineIds: competition.disciplines.map((d) => d.disciplineId),
  };
}

function dateRange(start: Date, end: Date) {
  return start.getTime() === end.getTime()
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}

// Detail event untuk admin & pelatih. Form edit hanya untuk pengelola (admin / pembuat event).
export async function CompetitionDetail({
  actor,
  competitionId,
  basePath,
}: {
  actor: Actor;
  competitionId: string;
  basePath: string;
}) {
  const competition = await loadCompetition(actor, competitionId);
  const editable = competition.canManage && isEditableStatus(competition.status);
  const selectedIds = competition.disciplines.map((d) => d.disciplineId);
  const disciplineOptions = editable ? await listCompetitionDisciplineOptions(selectedIds) : [];
  const lockedIds = competition.disciplines
    .filter((d) => d._count.entries > 0)
    .map((d) => d.disciplineId);

  return (
    <>
      <PageHeader
        title={competition.name}
        description={`${dateRange(competition.startDate, competition.endDate)} · ${competition.location}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <CompetitionStatusBadge status={competition.status} />
                </dd>
                <dt className="text-muted-foreground">Tingkat</dt>
                <dd>{COMPETITION_LEVEL_LABEL[competition.level]}</dd>
                <dt className="text-muted-foreground">Pendaftaran</dt>
                <dd>
                  {competition.registrationOpensAt && competition.registrationClosesAt ? (
                    <>
                      {formatDateTime(competition.registrationOpensAt)} –
                      <br />
                      {formatDateTime(competition.registrationClosesAt)} {CLUB_TIME_ZONE_LABEL}
                    </>
                  ) : (
                    "Belum diatur"
                  )}
                </dd>
                <dt className="text-muted-foreground">Maks. nomor</dt>
                <dd>{competition.maxEntriesPerAthlete ?? "Tidak dibatasi"}</dd>
                <dt className="text-muted-foreground">Pendaftar</dt>
                <dd className="numeric">{competition._count.registrations}</dd>
                <dt className="text-muted-foreground">Dibuat oleh</dt>
                <dd>
                  {competition.createdBy.name}
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(competition.createdAt)}
                  </div>
                </dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PDF event</CardTitle>
              <CardDescription>Bisa diunduh atlet setelah event dipublikasikan.</CardDescription>
            </CardHeader>
            <CardContent>
              <AttachmentCard
                competitionId={competition.id}
                fileName={competition.attachmentName}
                downloadHref={`/api/competitions/${competition.id}/attachment`}
                canManage={editable}
              />
            </CardContent>
          </Card>

          {competition.canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Status event</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPanel
                  competitionId={competition.id}
                  status={competition.status}
                  publishBlockers={competition.publishBlockers}
                  registrationCount={competition._count.registrations}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          {editable ? (
            <Card>
              <CardHeader>
                <CardTitle>Ubah event</CardTitle>
                <CardDescription>
                  {competition.status === "DRAFT"
                    ? "Event masih draft dan belum terlihat oleh atlet."
                    : "Event sudah dipublikasikan; perubahan langsung terlihat oleh atlet."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompetitionForm
                  competitionId={competition.id}
                  basePath={basePath}
                  defaults={toFormDefaults(competition)}
                  disciplines={disciplineOptions}
                  lockedDisciplineIds={lockedIds}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {competition.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Deskripsi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-line">{competition.description}</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Nomor lomba</CardTitle>
                  <CardDescription>
                    {competition.disciplines.length} nomor dibuka di event ini.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {competition.disciplines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada nomor lomba.</p>
                  ) : (
                    <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                      {competition.disciplines.map((d) => (
                        <li key={d.disciplineId}>
                          {d.discipline.name}
                          <span className="text-muted-foreground">
                            {" "}
                            · {d.discipline.poolLength}m
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
