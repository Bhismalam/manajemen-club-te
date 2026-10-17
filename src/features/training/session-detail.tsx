import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAppError } from "@/lib/errors";
import {
  CLUB_TIME_ZONE_LABEL,
  formatDateTime,
  formatTime,
  formatWeekdayDate,
  toClubDateInput,
} from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import {
  getTrainingSession,
  listManageableGroupOptions,
} from "@/services/training-session-service";

import { AttendanceSection } from "@/features/attendance/attendance-section";

import { DeleteSessionButton, SessionForm } from "./session-form";

async function loadSession(actor: Actor, sessionId: string) {
  try {
    return await getTrainingSession(actor, sessionId);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

// Detail sesi untuk admin & pelatih. Form edit hanya untuk yang boleh mengelola kelompoknya.
export async function SessionDetail({
  actor,
  sessionId,
  basePath,
}: {
  actor: Actor;
  sessionId: string;
  basePath: string;
}) {
  const session = await loadSession(actor, sessionId);
  const groups = session.canManage ? await listManageableGroupOptions(actor) : [];
  const blockedReason =
    session._count.attendances > 0 || session._count.timeTrials > 0
      ? "Sesi sudah punya absensi atau time trial, jadi tidak bisa dihapus."
      : null;

  return (
    <>
      <PageHeader
        title={session.title}
        description={`${formatWeekdayDate(session.startsAt)} · ${formatTime(session.startsAt)}–${formatTime(session.endsAt)} ${CLUB_TIME_ZONE_LABEL}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Kelompok</dt>
              <dd>{session.trainingGroup.name}</dd>
              <dt className="text-muted-foreground">Pelatih</dt>
              <dd>{session.trainingGroup.coach?.fullName ?? "—"}</dd>
              <dt className="text-muted-foreground">Lokasi</dt>
              <dd>{session.location ?? "—"}</dd>
              <dt className="text-muted-foreground">Dibuat oleh</dt>
              <dd>
                {session.createdBy.name}
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(session.createdAt)}
                </div>
              </dd>
              {session.notes && !session.canManage && (
                <>
                  <dt className="text-muted-foreground">Catatan</dt>
                  <dd className="whitespace-pre-line">{session.notes}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <AttendanceSection actor={actor} sessionId={session.id} />

          {session.canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Ubah sesi</CardTitle>
                <CardDescription>Perubahan langsung terlihat di jadwal atlet.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-8">
                <SessionForm
                  sessionId={session.id}
                  basePath={basePath}
                  groups={groups}
                  defaults={{
                    trainingGroupId: session.trainingGroupId,
                    title: session.title,
                    date: toClubDateInput(session.startsAt),
                    startTime: formatTime(session.startsAt),
                    endTime: formatTime(session.endsAt),
                    location: session.location ?? "",
                    notes: session.notes ?? "",
                  }}
                />
                <DeleteSessionButton
                  sessionId={session.id}
                  basePath={basePath}
                  blockedReason={blockedReason}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
