import { CalendarCheck, CalendarDays, Clock, MapPin, Medal, Timer, Trophy } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard, SectionEmpty } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import {
  eventDateRange,
  RegistrationWindowBadge,
} from "@/features/competition-registrations/event-summary";
import { EvaluationCard } from "@/features/evaluations/evaluation-card";
import { PersonalBestGrid } from "@/features/personal-bests/personal-best-card";
import { ProgressChart } from "@/features/personal-bests/progress-chart";
import { RaceHistory } from "@/features/race-results/race-history";
import { formatDuration } from "@/lib/duration";
import { CLUB_TIME_ZONE_LABEL, formatClubDate, formatTime, formatWeekdayDate } from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import { getAthleteDashboard } from "@/services/dashboard-service";

// Ringkasan atlet: latihan berikutnya, angka utama, event yang buka pendaftaran, PB & grafik,
// riwayat lomba, evaluasi terbaru.
export async function AthleteDashboard({ actor, name }: { actor: Actor; name: string }) {
  const now = new Date();
  const data = await getAthleteDashboard(actor, now);

  if (!data) {
    return (
      <EmptyState
        icon={Trophy}
        title="Profil atlet belum aktif"
        description="Hubungi admin klub agar profil atletmu diaktifkan."
      />
    );
  }

  const { nextSession, nextCompetition, latestTrial, medals } = data;
  const medalTotal = medals.GOLD + medals.SILVER + medals.BRONZE;

  return (
    <>
      <section className="flex flex-col gap-3 rounded-xl bg-primary p-5 text-primary-foreground">
        <h1 className="text-2xl font-bold md:text-[1.75rem]">Halo, {name}</h1>
        {nextSession ? (
          <div className="flex flex-col gap-1 text-sm">
            <span className="opacity-80">Latihan berikutnya</span>
            <span className="text-lg font-semibold">{nextSession.title}</span>
            <span className="flex flex-wrap gap-x-4 gap-y-1 opacity-90">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {formatWeekdayDate(nextSession.startsAt)}
              </span>
              <span className="numeric flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                {formatTime(nextSession.startsAt)}–{formatTime(nextSession.endsAt)}{" "}
                {CLUB_TIME_ZONE_LABEL}
              </span>
              {nextSession.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {nextSession.location}
                </span>
              )}
            </span>
          </div>
        ) : (
          <p className="text-sm opacity-90">Belum ada jadwal latihan berikutnya.</p>
        )}
        <Link
          href="/athlete/schedule"
          className={buttonVariants({ variant: "secondary", size: "sm", className: "self-start" })}
        >
          Lihat jadwal
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Kehadiran"
          value={data.attendance.rate}
          suffix="%"
          icon={CalendarCheck}
          href="/athlete/schedule"
          hint={`${data.attendance.total} sesi tercatat`}
        />
        <StatCard
          label="Personal best"
          value={data.pbs.length}
          icon={Trophy}
          href="/athlete/personal-bests"
          hint="nomor lomba"
        />
        <StatCard
          label="Time trial terakhir"
          value={latestTrial ? formatDuration(latestTrial.durationMs) : null}
          icon={Timer}
          href="/athlete/time-trials"
          hint={
            latestTrial
              ? `${latestTrial.discipline.name} · ${formatClubDate(latestTrial.trialDate)}`
              : "Belum ada"
          }
        />
        <StatCard
          label="Medali"
          value={medalTotal}
          icon={Medal}
          href="/athlete/results"
          hint={`${medals.GOLD} emas · ${medals.SILVER} perak · ${medals.BRONZE} perunggu`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Lomba berikutnya" href="/athlete/events" linkLabel="Semua event">
          {nextCompetition ? (
            <Link
              href={`/athlete/events/${nextCompetition.id}`}
              className="flex flex-col gap-1 rounded-lg border p-3 outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium">{nextCompetition.name}</span>
              <span className="text-sm text-muted-foreground">
                {eventDateRange(nextCompetition.startDate, nextCompetition.endDate)} ·{" "}
                {nextCompetition.location}
              </span>
              <span className="text-sm">
                Terdaftar di <span className="numeric">{nextCompetition.myEntryCount}</span> nomor
              </span>
            </Link>
          ) : (
            <SectionEmpty>Kamu belum terdaftar di event mana pun.</SectionEmpty>
          )}
        </SectionCard>

        <SectionCard title="Pendaftaran dibuka" href="/athlete/events" linkLabel="Semua event">
          {data.openEvents.length === 0 ? (
            <SectionEmpty>Tidak ada event baru yang sedang membuka pendaftaran.</SectionEmpty>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.openEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-medium">{event.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {eventDateRange(event.startDate, event.endDate)}
                    </span>
                    <RegistrationWindowBadge event={event} now={now} />
                  </span>
                  <Link
                    href={`/athlete/events/${event.id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Daftar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">PB terbaru</h2>
          {data.pbs.length > 3 && (
            <Link
              href="/athlete/personal-bests"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Lihat semua ({data.pbs.length})
            </Link>
          )}
        </div>
        <PersonalBestGrid
          pbs={data.latestPbs}
          hrefFor={(disciplineId) => `/athlete/personal-bests/${disciplineId}`}
          emptyDescription="PB muncul setelah pelatih mencatat time trial atau hasil lombamu."
        />
      </section>

      {data.progress && (
        <SectionCard
          title={`Perkembangan ${data.progress.discipline.name}`}
          href={`/athlete/personal-bests/${data.progress.discipline.id}`}
          linkLabel="Detail"
        >
          <ProgressChart
            title={`${data.progress.discipline.name} · kolam ${data.progress.discipline.poolLength}m`}
            points={data.progress.results.map((result) => ({
              id: result.id,
              dateLabel: formatClubDate(result.date),
              time: result.date.getTime(),
              durationMs: result.durationMs,
              label: result.label ?? (result.source === "COMPETITION" ? "Lomba" : "Time trial"),
              isPbAtTime: result.isPbAtTime,
            }))}
          />
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Hasil lomba terbaru</h2>
            <Link
              href="/athlete/results"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Riwayat lomba
            </Link>
          </div>
          <RaceHistory
            history={{ medals, events: data.recentResults }}
            emptyDescription="Hasil lombamu akan muncul setelah dicatat pelatih."
          />
        </section>
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Evaluasi terbaru</h2>
            <Link
              href="/athlete/evaluations"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Semua evaluasi
            </Link>
          </div>
          {data.latestEvaluation ? (
            <EvaluationCard evaluation={data.latestEvaluation} />
          ) : (
            <EmptyState
              icon={Trophy}
              title="Belum ada evaluasi"
              description="Evaluasi dari pelatihmu akan muncul di sini."
            />
          )}
        </section>
      </div>
    </>
  );
}
