import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDelta, formatDuration } from "@/lib/duration";
import { isAppError } from "@/lib/errors";
import { formatDateTime, formatWeekdayDate, toClubDateInput } from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import { getTimeTrial } from "@/services/time-trial-service";

import { DeleteTimeTrialButton, EditTimeTrialForm } from "./edit-time-trial-form";

async function loadTrial(actor: Actor, id: string) {
  try {
    return await getTimeTrial(actor, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

export async function TimeTrialDetail({
  actor,
  timeTrialId,
  basePath,
}: {
  actor: Actor;
  timeTrialId: string;
  basePath: string;
}) {
  const trial = await loadTrial(actor, timeTrialId);
  const isPb = trial.personalBest?.sourceId === trial.id;
  const today = toClubDateInput(new Date());

  return (
    <>
      <PageHeader
        title={`${trial.athlete.fullName} · ${trial.discipline.name}`}
        description={formatWeekdayDate(trial.trialDate)}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Hasil</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="numeric text-4xl font-semibold">{formatDuration(trial.durationMs)}</p>
            {isPb ? (
              <StatusBadge tone="success">PB atlet saat ini</StatusBadge>
            ) : trial.personalBest ? (
              <p className="text-sm text-muted-foreground">
                PB {formatDuration(trial.personalBest.durationMs)} (
                <span className="numeric">
                  {formatDelta(trial.durationMs - trial.personalBest.durationMs)}
                </span>{" "}
                dari PB)
              </p>
            ) : null}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Sesi</dt>
              <dd>{trial.trainingSession?.title ?? "—"}</dd>
              <dt className="text-muted-foreground">Catatan</dt>
              <dd>{trial.note ?? "—"}</dd>
              <dt className="text-muted-foreground">Dicatat oleh</dt>
              <dd>
                {trial.recordedBy.name}
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(trial.createdAt)}
                </div>
              </dd>
            </dl>
          </CardContent>
        </Card>

        {trial.canManage && (
          <Card className="self-start lg:col-span-2">
            <CardHeader>
              <CardTitle>Koreksi time trial</CardTitle>
              <CardDescription>
                PB atlet dihitung ulang otomatis setelah diubah atau dihapus. Untuk atlet atau nomor
                lomba yang salah, hapus lalu catat ulang.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-8">
              <EditTimeTrialForm
                timeTrialId={trial.id}
                today={today}
                defaults={{
                  date: toClubDateInput(trial.trialDate),
                  time: formatDuration(trial.durationMs),
                  note: trial.note ?? "",
                }}
              />
              <DeleteTimeTrialButton timeTrialId={trial.id} basePath={basePath} isPb={isPb} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
