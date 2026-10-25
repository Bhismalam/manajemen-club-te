import { Award, ClipboardPen, Users, Waves } from "lucide-react";
import Link from "next/link";

import { SectionCard, SectionEmpty } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  eventDateRange,
  RegistrationWindowBadge,
} from "@/features/competition-registrations/event-summary";
import { formatDuration } from "@/lib/duration";
import { isEvaluationDue } from "@/lib/evaluations";
import { formatClubDate, formatTime, formatWeekdayDate } from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import { getCoachDashboard } from "@/services/dashboard-service";

const itemLink =
  "flex flex-col gap-0.5 py-2 outline-none hover:text-primary focus-visible:text-primary";

// Ringkasan pelatih: latihan hari ini, atlet binaan, time trial & PB terbaru, event, evaluasi.
export async function CoachDashboard({ actor }: { actor: Actor }) {
  const now = new Date();
  const data = await getCoachDashboard(actor, now);
  const due = data.athletes.filter((a) => a.isActive && isEvaluationDue(a.lastEvaluationDate, now));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Atlet binaan"
          value={data.activeAthleteCount}
          icon={Users}
          href="/coach/athletes"
        />
        <StatCard
          label="Latihan hari ini"
          value={data.todaySessions.length}
          icon={Waves}
          href="/coach/training"
        />
        <StatCard
          label="PB bulan ini"
          value={data.monthPbs.length}
          icon={Award}
          hint="atlet binaan"
        />
        <StatCard
          label="Perlu evaluasi"
          value={due.length}
          icon={ClipboardPen}
          href="/coach/athletes"
          hint="> 30 hari / belum pernah"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Latihan hari ini"
          href="/coach/training"
          description={data.todaySessions.length === 0 ? undefined : "Klik untuk mengisi absensi."}
        >
          {data.todaySessions.length === 0 ? (
            <>
              <SectionEmpty>Tidak ada latihan hari ini.</SectionEmpty>
              {data.upcomingSessions.length > 0 && (
                <ul className="flex flex-col divide-y border-t">
                  {data.upcomingSessions.map((session) => (
                    <li key={session.id}>
                      <Link href={`/coach/training/${session.id}`} className={itemLink}>
                        <span className="text-sm font-medium">{session.title}</span>
                        <span className="numeric text-xs text-muted-foreground">
                          {formatWeekdayDate(session.startsAt)} · {formatTime(session.startsAt)} ·{" "}
                          {session.trainingGroup.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.todaySessions.map((session) => {
                const recorded = session._count.attendances;
                const total = session.trainingGroup._count.athletes;
                return (
                  <li key={session.id}>
                    <Link href={`/coach/training/${session.id}`} className={itemLink}>
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">{session.title}</span>
                        {recorded === 0 ? (
                          <StatusBadge tone="warning">Belum absen</StatusBadge>
                        ) : (
                          <StatusBadge tone={recorded >= total ? "success" : "info"}>
                            Absen {recorded}/{total}
                          </StatusBadge>
                        )}
                      </span>
                      <span className="numeric text-xs text-muted-foreground">
                        {formatTime(session.startsAt)}–{formatTime(session.endsAt)} ·{" "}
                        {session.trainingGroup.name}
                        {session.location ? ` · ${session.location}` : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Perlu evaluasi" href="/coach/athletes" linkLabel="Atlet binaan">
          {due.length === 0 ? (
            <SectionEmpty>Semua atlet aktif sudah dievaluasi dalam 30 hari terakhir.</SectionEmpty>
          ) : (
            <ul className="flex flex-col divide-y">
              {due.slice(0, 5).map((athlete) => (
                <li key={athlete.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{athlete.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {athlete.lastEvaluationDate
                        ? `Terakhir ${formatClubDate(athlete.lastEvaluationDate)}`
                        : "Belum pernah dievaluasi"}
                    </span>
                  </span>
                  <Link
                    href={`/coach/evaluations/new?athlete=${athlete.id}`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Tulis
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Time trial terbaru" href="/coach/time-trials">
          {data.recentTrials.length === 0 ? (
            <SectionEmpty>Belum ada time trial.</SectionEmpty>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.recentTrials.map((trial) => (
                <li key={trial.id}>
                  <Link href={`/coach/time-trials/${trial.id}`} className={itemLink}>
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{trial.athlete.fullName}</span>
                      <span className="numeric font-semibold">
                        {formatDuration(trial.durationMs)}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {trial.discipline.name} · {formatClubDate(trial.trialDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="PB baru bulan ini">
          {data.monthPbs.length === 0 ? (
            <SectionEmpty>Belum ada PB baru bulan ini.</SectionEmpty>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.monthPbs.slice(0, 6).map((pb) => (
                <li key={pb.id}>
                  <Link
                    href={`/coach/athletes/${pb.athlete.id}/personal-bests/${pb.discipline.id}`}
                    className={itemLink}
                  >
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{pb.athlete.fullName}</span>
                      <span className="numeric font-semibold">{formatDuration(pb.durationMs)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pb.discipline.name} · {formatClubDate(pb.achievedAt)} ·{" "}
                      {pb.sourceType === "COMPETITION" ? "Lomba" : "Time trial"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Event terdekat" href="/coach/competitions">
        {data.events.length === 0 ? (
          <SectionEmpty>Belum ada event yang dipublikasikan.</SectionEmpty>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.events.map((event) => (
              <li key={event.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <span className="text-sm font-medium">{event.name}</span>
                <span className="text-xs text-muted-foreground">
                  {eventDateRange(event.startDate, event.endDate)} · {event.location}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <RegistrationWindowBadge event={event} now={now} />
                  <span className="text-muted-foreground">
                    <span className="numeric">{event._count.registrations}</span> atlet binaan
                    terdaftar
                  </span>
                </span>
                <Link
                  href={`/coach/competitions/${event.id}/register`}
                  className="self-start text-sm text-primary underline-offset-4 hover:underline"
                >
                  Daftarkan atlet
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
