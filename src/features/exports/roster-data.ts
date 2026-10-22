import { COMPETITION_LEVEL_LABEL, GENDER_LABEL } from "@/constants/labels";
import { formatDuration } from "@/lib/duration";
import { formatDate, formatDateTime } from "@/lib/format";
import { groupByDiscipline } from "@/lib/registrations";
import type { Roster } from "@/services/competition-registration-service";

// Data rekap pendaftar dalam bentuk teks siap cetak, dipakai bersama oleh export Excel & PDF.

const GENDER_SHORT = { MALE: "L", FEMALE: "P" } as const;

export function seedLabel(ms: number | null) {
  return ms === null ? "—" : formatDuration(ms);
}

export function toRosterExport(roster: Roster, now = new Date()) {
  const { competition, rows, summary } = roster;
  const nameOf = new Map(competition.disciplines.map((d) => [d.id, d.name]));
  const active = rows.filter((row) => row.status === "REGISTERED");

  const athletes = active.map((row, index) => ({
    no: index + 1,
    fullName: row.athlete.fullName,
    athleteNumber: row.athlete.athleteNumber,
    gender: GENDER_SHORT[row.athlete.gender],
    genderLabel: GENDER_LABEL[row.athlete.gender],
    birthDate: formatDate(row.athlete.birthDate),
    birthYear: row.athlete.birthDate.getUTCFullYear(),
    group: row.athlete.trainingGroup?.name ?? "—",
    entries: row.entries.map((entry) => ({
      discipline: nameOf.get(entry.disciplineId) ?? "?",
      seed: seedLabel(entry.seedTimeMs),
    })),
    registeredBy: row.registeredBy.name,
    registeredAt: formatDateTime(row.createdAt),
  }));

  const byDiscipline = groupByDiscipline(competition.disciplines, active)
    .filter((group) => group.participants.length > 0)
    .map((group) => ({
      name: group.discipline.name,
      poolLength: group.discipline.poolLength,
      participants: group.participants.map((p, index) => ({
        no: index + 1,
        fullName: p.row.athlete.fullName,
        athleteNumber: p.row.athlete.athleteNumber,
        gender: GENDER_SHORT[p.row.athlete.gender],
        birthYear: p.row.athlete.birthDate.getUTCFullYear(),
        group: p.row.athlete.trainingGroup?.name ?? "—",
        seed: seedLabel(p.seedTimeMs),
      })),
    }));

  const dates =
    competition.startDate.getTime() === competition.endDate.getTime()
      ? formatDate(competition.startDate)
      : `${formatDate(competition.startDate)} – ${formatDate(competition.endDate)}`;

  return {
    event: {
      name: competition.name,
      dates,
      location: competition.location,
      level: COMPETITION_LEVEL_LABEL[competition.level],
    },
    totals: { athletes: summary.athletes, entries: summary.entries },
    generatedAt: formatDateTime(now),
    athletes,
    byDiscipline,
  };
}

export type RosterExport = ReturnType<typeof toRosterExport>;
