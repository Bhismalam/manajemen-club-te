import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { Medal, ResultStatus, Round } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { parseDuration } from "@/lib/duration";
import { AppError } from "@/lib/errors";
import { toClubDateInput } from "@/lib/format";
import { describePbChange } from "@/lib/personal-best";
import { canManageAthletePerformance } from "@/lib/permissions/policies";
import { athleteScope, competitionScope } from "@/lib/permissions/scopes";
import type { Actor } from "@/lib/permissions/types";
import { canRecordResults, compareResults } from "@/lib/race-results";
import { emptyToNull } from "@/lib/validations/common";
import type { ResultSheetFilter, SaveResultsInput } from "@/lib/validations/race-results";
import { writeAuditLog } from "@/services/audit-log-service";
import { recomputePersonalBest } from "@/services/personal-best-service";

// Hasil lomba per entry pendaftaran + babak (doc/PRD.md §4.10). Admin mencatat untuk semua atlet,
// pelatih untuk atlet binaannya. Hanya entry dari pendaftaran yang masih aktif.

const ACTIVE_ENTRY = { registration: { status: "REGISTERED" } } as const;
const RESULT_EVENT_STATUSES = ["UPCOMING", "ONGOING", "COMPLETED"] as const;

function entryScope(actor: Actor, competitionId: string): Prisma.CompetitionEntryWhereInput {
  return { competitionId, ...ACTIVE_ENTRY, athlete: athleteScope(actor) };
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

// Event yang punya peserta (dalam scope actor), terbaru dulu, dengan progres pencatatan hasil.
export async function listResultEvents(actor: Actor, now = new Date()) {
  const events = await prisma.competition.findMany({
    where: {
      AND: [
        competitionScope(actor),
        { status: { in: [...RESULT_EVENT_STATUSES] } },
        { registrations: { some: { status: "REGISTERED", athlete: athleteScope(actor) } } },
      ],
    },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      location: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });
  if (events.length === 0) return [];

  const entries = await prisma.competitionEntry.findMany({
    where: {
      competitionId: { in: events.map((e) => e.id) },
      ...ACTIVE_ENTRY,
      athlete: athleteScope(actor),
    },
    select: { competitionId: true, _count: { select: { raceResults: true } } },
  });
  const today = toClubDateInput(now);

  return events.map((event) => {
    const own = entries.filter((e) => e.competitionId === event.id);
    return {
      ...event,
      entryCount: own.length,
      recordedCount: own.filter((e) => e._count.raceResults > 0).length,
      canRecord: canRecordResults(event, today),
    };
  });
}

export async function getResultSheet(
  actor: Actor,
  competitionId: string,
  filter: ResultSheetFilter,
  now = new Date(),
) {
  const competition = await prisma.competition.findFirst({
    where: { AND: [{ id: competitionId }, competitionScope(actor)] },
    select: {
      id: true,
      name: true,
      location: true,
      startDate: true,
      endDate: true,
      status: true,
      disciplines: {
        orderBy: [
          { discipline: { sportType: "asc" } },
          { discipline: { style: "asc" } },
          { discipline: { distanceMeter: "asc" } },
        ],
        select: { discipline: { select: { id: true, name: true, poolLength: true } } },
      },
    },
  });
  if (!competition) throw new AppError("NOT_FOUND", "Event tidak ditemukan.");

  const scope = entryScope(actor, competition.id);
  const [entries, roundCounts] = await Promise.all([
    prisma.competitionEntry.findMany({
      where: { ...scope, ...(filter.discipline ? { disciplineId: filter.discipline } : {}) },
      select: {
        id: true,
        athleteId: true,
        disciplineId: true,
        seedTimeMs: true,
        athlete: {
          select: {
            fullName: true,
            athleteNumber: true,
            gender: true,
            trainingGroup: { select: { name: true } },
          },
        },
        raceResults: {
          where: { round: filter.round },
          select: {
            id: true,
            status: true,
            durationMs: true,
            rank: true,
            medal: true,
            note: true,
          },
        },
      },
    }),
    prisma.raceResult.groupBy({
      by: ["round"],
      where: { competitionEntry: scope },
      _count: { _all: true },
    }),
  ]);

  const pbs = await prisma.personalBest.findMany({
    where: {
      athleteId: { in: [...new Set(entries.map((e) => e.athleteId))] },
      disciplineId: { in: [...new Set(entries.map((e) => e.disciplineId))] },
    },
    select: { athleteId: true, disciplineId: true, durationMs: true, sourceId: true },
  });
  const pbOf = new Map(pbs.map((pb) => [`${pb.athleteId}:${pb.disciplineId}`, pb]));

  const rows = entries.map((entry) => {
    const result = entry.raceResults[0] ?? null;
    const pb = pbOf.get(`${entry.athleteId}:${entry.disciplineId}`) ?? null;
    return {
      entryId: entry.id,
      disciplineId: entry.disciplineId,
      athleteName: entry.athlete.fullName,
      athleteNumber: entry.athlete.athleteNumber,
      gender: entry.athlete.gender,
      groupName: entry.athlete.trainingGroup?.name ?? null,
      seedTimeMs: entry.seedTimeMs,
      pbMs: pb?.durationMs ?? null,
      result,
      isCurrentPb: result !== null && pb?.sourceId === result.id,
    };
  });

  const disciplines = competition.disciplines
    .map((d) => d.discipline)
    .filter((d) => !filter.discipline || d.id === filter.discipline)
    .map((discipline) => ({
      ...discipline,
      rows: rows
        .filter((row) => row.disciplineId === discipline.id)
        .sort((a, b) => {
          if (a.result && b.result) return compareResults(a.result, b.result);
          if (a.result || b.result) return a.result ? -1 : 1;
          return (
            (a.seedTimeMs ?? Number.POSITIVE_INFINITY) -
              (b.seedTimeMs ?? Number.POSITIVE_INFINITY) ||
            a.athleteName.localeCompare(b.athleteName, "id")
          );
        }),
    }))
    .filter((d) => d.rows.length > 0);

  return {
    competition: {
      id: competition.id,
      name: competition.name,
      location: competition.location,
      startDate: competition.startDate,
      endDate: competition.endDate,
      status: competition.status,
      disciplineOptions: competition.disciplines.map((d) => d.discipline),
    },
    disciplines,
    roundCounts: Object.fromEntries(roundCounts.map((r) => [r.round, r._count._all])) as Partial<
      Record<Round, number>
    >,
    canRecord: canRecordResults(competition, toClubDateInput(now)),
  };
}

export type ResultSheet = Awaited<ReturnType<typeof getResultSheet>>;

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export type SaveResultsSummary = {
  created: number;
  updated: number;
  deleted: number;
  newPbs: {
    athleteName: string;
    discipline: string;
    durationMs: number;
    previousMs: number | null;
  }[];
};

type ResultData = {
  status: ResultStatus;
  durationMs: number | null;
  rank: number | null;
  medal: Medal;
  note: string | null;
};

function toResultData(row: SaveResultsInput["rows"][number]): ResultData {
  const finished = row.status === "FINISHED";
  return {
    status: row.status as ResultStatus,
    durationMs: finished ? parseDuration(row.time) : null,
    rank: finished && row.rank !== "" ? Number(row.rank) : null,
    medal: finished ? row.medal : "NONE",
    note: emptyToNull(row.note),
  };
}

function sameResult(a: ResultData, b: ResultData) {
  return (
    a.status === b.status &&
    a.durationMs === b.durationMs &&
    a.rank === b.rank &&
    a.medal === b.medal &&
    a.note === b.note
  );
}

export async function saveResults(
  actor: Actor,
  input: SaveResultsInput,
  now = new Date(),
): Promise<SaveResultsSummary> {
  const competition = await prisma.competition.findFirst({
    where: { AND: [{ id: input.competitionId }, competitionScope(actor)] },
    select: { id: true, name: true, status: true, startDate: true },
  });
  if (!competition) throw new AppError("NOT_FOUND", "Event tidak ditemukan.");
  if (!canRecordResults(competition, toClubDateInput(now))) {
    throw new AppError(
      "CONFLICT",
      "Hasil lomba hanya bisa dicatat saat event berlangsung atau sudah selesai.",
    );
  }

  const entries = await prisma.competitionEntry.findMany({
    where: {
      ...entryScope(actor, competition.id),
      id: { in: input.rows.map((row) => row.entryId) },
    },
    select: {
      id: true,
      athleteId: true,
      disciplineId: true,
      athlete: { select: { fullName: true, trainingGroup: { select: { coachId: true } } } },
      discipline: { select: { name: true } },
      raceResults: {
        where: { round: input.round },
        select: {
          id: true,
          status: true,
          durationMs: true,
          rank: true,
          medal: true,
          note: true,
        },
      },
    },
  });
  const allowed = entries.filter((entry) =>
    canManageAthletePerformance(actor, { coachId: entry.athlete.trainingGroup?.coachId ?? null }),
  );
  if (allowed.length !== input.rows.length) {
    throw new AppError("FORBIDDEN", "Ada peserta yang tidak boleh kamu catat hasilnya.");
  }
  const entryById = new Map(allowed.map((entry) => [entry.id, entry]));

  return prisma.$transaction(async (tx) => {
    const summary: SaveResultsSummary = { created: 0, updated: 0, deleted: 0, newPbs: [] };
    const changes: Prisma.InputJsonObject[] = [];
    // Hasil FINISHED yang disimpan di batch ini, per atlet+nomor, untuk deteksi PB baru.
    const touched = new Map<string, { entryId: string; resultId: string | null }>();

    for (const row of input.rows) {
      const entry = entryById.get(row.entryId)!;
      const existing = entry.raceResults[0] ?? null;
      const key = `${entry.athleteId}:${entry.disciplineId}`;

      if (row.status === "") {
        if (!existing) continue;
        await tx.raceResult.delete({ where: { id: existing.id } });
        summary.deleted += 1;
        touched.set(key, { entryId: entry.id, resultId: null });
        changes.push({ entryId: entry.id, action: "deleted", before: existing.status });
        continue;
      }

      const data = toResultData(row);
      if (existing && sameResult(existing, data)) continue;
      const saved = existing
        ? await tx.raceResult.update({
            where: { id: existing.id },
            data: { ...data, recordedById: actor.userId },
            select: { id: true },
          })
        : await tx.raceResult.create({
            data: {
              ...data,
              competitionEntryId: entry.id,
              round: input.round,
              recordedById: actor.userId,
            },
            select: { id: true },
          });
      summary[existing ? "updated" : "created"] += 1;
      touched.set(key, { entryId: entry.id, resultId: saved.id });
      changes.push({
        entryId: entry.id,
        action: existing ? "updated" : "created",
        status: data.status,
        durationMs: data.durationMs,
        rank: data.rank,
        medal: data.medal,
      });
    }

    for (const [key, { entryId, resultId }] of touched) {
      const entry = entryById.get(entryId)!;
      const [athleteId, disciplineId] = key.split(":") as [string, string];
      const { before, after } = await recomputePersonalBest(tx, athleteId, disciplineId);
      if (resultId && after) {
        const change = describePbChange(before, after, resultId);
        if (change.isNewPb && change.currentMs !== null) {
          summary.newPbs.push({
            athleteName: entry.athlete.fullName,
            discipline: entry.discipline.name,
            durationMs: change.currentMs,
            previousMs: change.previousMs,
          });
        }
      }
    }

    if (changes.length > 0) {
      await writeAuditLog(tx, {
        actorUserId: actor.userId,
        action: "race_result.saved",
        entityType: "Competition",
        entityId: competition.id,
        metadata: { round: input.round, newPbs: summary.newPbs.length, changes },
      });
    }
    return summary;
  });
}

// ---------------------------------------------------------------------------
// Riwayat lomba atlet (akses ke atlet dicek pemanggil: requireAthleteAccess / actor.athleteId)
// ---------------------------------------------------------------------------

export async function listAthleteRaceHistory(athleteId: string) {
  const [results, pbs] = await Promise.all([
    prisma.raceResult.findMany({
      where: { competitionEntry: { athleteId, ...ACTIVE_ENTRY } },
      select: {
        id: true,
        status: true,
        durationMs: true,
        rank: true,
        medal: true,
        round: true,
        note: true,
        competitionEntry: {
          select: {
            seedTimeMs: true,
            discipline: { select: { id: true, name: true, poolLength: true } },
            registration: {
              select: {
                competition: {
                  select: { id: true, name: true, location: true, startDate: true, endDate: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.personalBest.findMany({
      where: { athleteId, sourceType: "COMPETITION" },
      select: { sourceId: true },
    }),
  ]);
  const pbSources = new Set(pbs.map((pb) => pb.sourceId));

  type Event = (typeof results)[number]["competitionEntry"]["registration"]["competition"];
  const events = new Map<string, { event: Event; results: typeof rows }>();
  const rows = results.map((result) => ({
    id: result.id,
    status: result.status,
    durationMs: result.durationMs,
    rank: result.rank,
    medal: result.medal,
    round: result.round,
    note: result.note,
    seedTimeMs: result.competitionEntry.seedTimeMs,
    discipline: result.competitionEntry.discipline,
    isCurrentPb: pbSources.has(result.id),
    event: result.competitionEntry.registration.competition,
  }));
  for (const row of rows) {
    const group = events.get(row.event.id) ?? { event: row.event, results: [] };
    group.results.push(row);
    events.set(row.event.id, group);
  }

  const medals = { GOLD: 0, SILVER: 0, BRONZE: 0 };
  for (const row of rows) if (row.medal !== "NONE") medals[row.medal] += 1;

  return {
    medals,
    events: [...events.values()]
      .sort((a, b) => b.event.startDate.getTime() - a.event.startDate.getTime())
      .map((group) => ({
        event: group.event,
        results: group.results.sort(
          (a, b) =>
            a.discipline.name.localeCompare(b.discipline.name, "id") ||
            ROUND_ORDER[a.round] - ROUND_ORDER[b.round],
        ),
      })),
  };
}

const ROUND_ORDER: Record<Round, number> = { HEAT: 0, SEMIFINAL: 1, FINAL: 2, TIME_FINAL: 3 };
