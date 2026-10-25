import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { summarizeAttendance } from "@/lib/attendance";
import { clubDateTimeToUtc, clubDayRange, toClubDateInput } from "@/lib/format";
import { athleteScope, competitionScope, trainingSessionScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import { registrationWindowState } from "@/lib/registrations";
import { dateOnly } from "@/lib/validations/common";
import { listCoachAthletes } from "@/services/athlete-service";
import { getAthleteAttendanceHistory } from "@/services/attendance-service";
import { listAthleteEvents } from "@/services/competition-registration-service";
import { listEvaluations } from "@/services/evaluation-service";
import { getDisciplineProgress, listPersonalBests } from "@/services/personal-best-service";
import { listAthleteRaceHistory } from "@/services/race-result-service";
import { getUserCounts } from "@/services/user-admin-service";

// Data ringkasan per role (doc/PRD.md §4.12). Semua query memakai scope actor.

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_EVENT: Prisma.CompetitionWhereInput = { status: { in: ["UPCOMING", "ONGOING"] } };

function clubToday(now: Date) {
  const today = toClubDateInput(now);
  return { today, ...clubDayRange(today) };
}

// Awal bulan berjalan menurut kalender klub.
function clubMonthStart(now: Date) {
  return clubDateTimeToUtc(`${toClubDateInput(now).slice(0, 7)}-01`, "00:00");
}

const sessionSelect = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  location: true,
  trainingGroup: { select: { name: true } },
} as const;

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function getAdminDashboard(actor: Actor, now = new Date()) {
  const { today, start, end } = clubToday(now);
  const since = new Date(start.getTime() - 30 * DAY_MS);

  const [counts, sessions, events, attendance, activity] = await Promise.all([
    getUserCounts(),
    prisma.trainingSession.findMany({
      where: { AND: [trainingSessionScope(actor), { startsAt: { gte: start } }] },
      orderBy: { startsAt: "asc" },
      take: 5,
      select: sessionSelect,
    }),
    prisma.competition.findMany({
      where: {
        AND: [competitionScope(actor), ACTIVE_EVENT, { endDate: { gte: dateOnly(today) } }],
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        location: true,
        startDate: true,
        endDate: true,
        status: true,
        registrationOpensAt: true,
        registrationClosesAt: true,
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
    }),
    prisma.attendance.findMany({
      where: { trainingSession: { startsAt: { gte: since, lt: end } } },
      select: {
        status: true,
        trainingSession: { select: { trainingGroup: { select: { id: true, name: true } } } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, action: true, createdAt: true, actor: { select: { name: true } } },
    }),
  ]);

  const groups = new Map<
    string,
    { name: string; statuses: (typeof attendance)[number]["status"][] }
  >();
  for (const record of attendance) {
    const group = record.trainingSession.trainingGroup;
    const entry = groups.get(group.id) ?? { name: group.name, statuses: [] };
    entry.statuses.push(record.status);
    groups.set(group.id, entry);
  }

  return {
    counts,
    sessions,
    events,
    attendance: {
      overall: summarizeAttendance(attendance.map((record) => record.status)),
      byGroup: [...groups.entries()]
        .map(([id, group]) => ({
          id,
          name: group.name,
          counts: summarizeAttendance(group.statuses),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "id")),
    },
    activity,
  };
}

// ---------------------------------------------------------------------------
// Pelatih
// ---------------------------------------------------------------------------

export async function getCoachDashboard(actor: Actor, now = new Date()) {
  const { today, start, end } = clubToday(now);

  const [athletes, todaySessions, upcomingSessions, recentTrials, monthPbs, events] =
    await Promise.all([
      listCoachAthletes(actor),
      prisma.trainingSession.findMany({
        where: { AND: [trainingSessionScope(actor), { startsAt: { gte: start, lt: end } }] },
        orderBy: { startsAt: "asc" },
        select: {
          ...sessionSelect,
          trainingGroup: {
            select: { name: true, _count: { select: { athletes: { where: { isActive: true } } } } },
          },
          _count: { select: { attendances: true } },
        },
      }),
      prisma.trainingSession.findMany({
        where: { AND: [trainingSessionScope(actor), { startsAt: { gte: end } }] },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: sessionSelect,
      }),
      prisma.timeTrial.findMany({
        where: { athlete: athleteScope(actor) },
        orderBy: [{ trialDate: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          durationMs: true,
          trialDate: true,
          athlete: { select: { fullName: true } },
          discipline: { select: { name: true } },
        },
      }),
      prisma.personalBest.findMany({
        where: { athlete: athleteScope(actor), achievedAt: { gte: clubMonthStart(now) } },
        orderBy: { achievedAt: "desc" },
        select: {
          id: true,
          durationMs: true,
          achievedAt: true,
          sourceType: true,
          athlete: { select: { id: true, fullName: true } },
          discipline: { select: { id: true, name: true } },
        },
      }),
      prisma.competition.findMany({
        where: {
          AND: [competitionScope(actor), ACTIVE_EVENT, { endDate: { gte: dateOnly(today) } }],
        },
        orderBy: { startDate: "asc" },
        take: 4,
        select: {
          id: true,
          name: true,
          location: true,
          startDate: true,
          endDate: true,
          status: true,
          registrationOpensAt: true,
          registrationClosesAt: true,
          _count: {
            select: {
              registrations: { where: { status: "REGISTERED", athlete: athleteScope(actor) } },
            },
          },
        },
      }),
    ]);

  return {
    athletes,
    activeAthleteCount: athletes.filter((a) => a.isActive).length,
    todaySessions,
    upcomingSessions,
    recentTrials,
    monthPbs,
    events,
  };
}

// ---------------------------------------------------------------------------
// Atlet (athleteId selalu dari session)
// ---------------------------------------------------------------------------

export async function getAthleteDashboard(actor: Actor, now = new Date()) {
  const athleteId = actor.athleteId;
  if (!athleteId) return null;

  const [nextSession, pbs, latestTrial, attendance, events, history, evaluations] =
    await Promise.all([
      prisma.trainingSession.findFirst({
        where: { AND: [trainingSessionScope(actor), { endsAt: { gte: now } }] },
        orderBy: { startsAt: "asc" },
        select: sessionSelect,
      }),
      listPersonalBests(athleteId),
      prisma.timeTrial.findFirst({
        where: { athleteId },
        orderBy: [{ trialDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          durationMs: true,
          trialDate: true,
          disciplineId: true,
          discipline: { select: { name: true } },
        },
      }),
      getAthleteAttendanceHistory(athleteId, 0),
      listAthleteEvents(actor, now),
      listAthleteRaceHistory(athleteId),
      listEvaluations(actor, { athlete: "", page: 1 }),
    ]);

  // Grafik: nomor dari time trial terakhir, atau PB terbaru.
  const latestPb = [...pbs].sort((a, b) => b.achievedAt.getTime() - a.achievedAt.getTime())[0];
  const chartDisciplineId = latestTrial?.disciplineId ?? latestPb?.discipline.id ?? null;
  const progress = chartDisciplineId
    ? await getDisciplineProgress(athleteId, chartDisciplineId)
    : null;

  const registered = events.filter((event) => event.myEntryCount !== null);
  const open = events.filter(
    (event) =>
      event.myEntryCount === null &&
      event.status === "UPCOMING" &&
      registrationWindowState(event, now).state === "open",
  );

  return {
    nextSession,
    pbs,
    latestPbs: [...pbs].sort((a, b) => b.achievedAt.getTime() - a.achievedAt.getTime()).slice(0, 3),
    latestTrial,
    attendance: attendance.counts,
    nextCompetition:
      [...registered].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] ?? null,
    openEvents: open.slice(0, 3),
    recentResults: history.events.slice(0, 2),
    medals: history.medals,
    latestEvaluation: evaluations.items[0] ?? null,
    progress: progress && progress.results.length >= 2 ? progress : null,
  };
}
