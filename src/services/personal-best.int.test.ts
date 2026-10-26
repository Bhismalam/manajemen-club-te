import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { toClubDateInput } from "@/lib/format";
import { isAppError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions/types";
import {
  createAdmin,
  createAthlete,
  createCoach,
  createCompetition,
  createDiscipline,
  createGroup,
} from "@/test/factories";

import { saveResults } from "./race-result-service";
import { deleteTimeTrial, recordTimeTrials, updateTimeTrial } from "./time-trial-service";

const today = toClubDateInput(new Date());
const pbOf = (athleteId: string, disciplineId: string) =>
  prisma.personalBest.findUnique({
    where: { athleteId_disciplineId: { athleteId, disciplineId } },
  });

async function errorCode(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  return isAppError(error) ? error.code : String(error);
}

describe("personal best: time trial & hasil lomba", () => {
  let admin: Actor;
  let coach: Awaited<ReturnType<typeof createCoach>>;
  let otherCoach: Awaited<ReturnType<typeof createCoach>>;
  let athlete: Awaited<ReturnType<typeof createAthlete>>;
  let discipline: Awaited<ReturnType<typeof createDiscipline>>;

  beforeEach(async () => {
    admin = await createAdmin();
    coach = await createCoach();
    otherCoach = await createCoach();
    const group = await createGroup(coach.id);
    athlete = await createAthlete({ groupId: group.id });
    discipline = await createDiscipline();
  });

  const record = (actor: Actor, time: string) =>
    recordTimeTrials(actor, {
      disciplineId: discipline.id,
      date: today,
      trainingSessionId: "",
      entries: [{ athleteId: athlete.id, time, note: "" }],
    });

  it("time trial pertama menjadi PB; yang lebih cepat menggantikan", async () => {
    const [first] = await record(coach.actor, "32.10");
    expect(first?.isNewPb).toBe(true);
    expect((await pbOf(athlete.id, discipline.id))?.durationMs).toBe(32_100);

    const [slower] = await record(coach.actor, "33.00");
    expect(slower?.isNewPb).toBe(false);
    const [faster] = await record(coach.actor, "31.50");
    expect(faster).toMatchObject({ isNewPb: true, previousPbMs: 32_100 });
    expect((await pbOf(athlete.id, discipline.id))?.durationMs).toBe(31_500);
  });

  it("koreksi/hapus time trial PB menurunkan PB ke hasil terbaik berikutnya", async () => {
    await record(coach.actor, "32.10");
    const [best] = await record(coach.actor, "31.50");
    await updateTimeTrial(coach.actor, {
      timeTrialId: best!.timeTrialId,
      date: today,
      time: "33.20",
      note: "",
    });
    expect((await pbOf(athlete.id, discipline.id))?.durationMs).toBe(32_100);

    const trials = await prisma.timeTrial.findMany({ where: { athleteId: athlete.id } });
    for (const trial of trials) await deleteTimeTrial(coach.actor, trial.id);
    expect(await pbOf(athlete.id, discipline.id)).toBeNull();
  });

  it("pelatih lain tidak bisa mencatat atau mengubah time trial atlet ini", async () => {
    expect(await errorCode(record(otherCoach.actor, "30.00"))).toBe("FORBIDDEN");
    const [trial] = await record(coach.actor, "32.10");
    // Di luar scope: 404 (tidak membocorkan keberadaan data) atau 403.
    expect(["NOT_FOUND", "FORBIDDEN"]).toContain(
      await errorCode(
        updateTimeTrial(otherCoach.actor, {
          timeTrialId: trial!.timeTrialId,
          date: today,
          time: "20.00",
          note: "",
        }),
      ),
    );
    expect((await pbOf(athlete.id, discipline.id))?.durationMs).toBe(32_100);
  });

  it("atlet tidak bisa mencatat performanya sendiri", async () => {
    expect(await errorCode(record(athlete.actor, "25.00"))).toBe("FORBIDDEN");
  });

  it("hasil lomba FINISHED ikut menentukan PB; DNS/DNF tidak", async () => {
    await record(coach.actor, "32.10");
    const competition = await createCompetition({
      createdById: admin.userId,
      disciplineIds: [discipline.id],
      status: "ONGOING",
      startsInDays: 0,
    });
    const registration = await prisma.competitionRegistration.create({
      data: {
        competitionId: competition.id,
        athleteId: athlete.id,
        registeredByUserId: admin.userId,
      },
    });
    const entry = await prisma.competitionEntry.create({
      data: {
        registrationId: registration.id,
        competitionId: competition.id,
        athleteId: athlete.id,
        disciplineId: discipline.id,
        seedTimeMs: 32_100,
      },
    });
    const row = (patch: object) => ({
      entryId: entry.id,
      status: "FINISHED" as const,
      time: "",
      rank: "",
      medal: "NONE" as const,
      note: "",
      ...patch,
    });

    const dns = await saveResults(coach.actor, {
      competitionId: competition.id,
      round: "TIME_FINAL",
      rows: [row({ status: "DNS" })],
    });
    expect(dns.newPbs).toHaveLength(0);

    const finished = await saveResults(coach.actor, {
      competitionId: competition.id,
      round: "TIME_FINAL",
      rows: [row({ time: "31.20", rank: "1", medal: "GOLD" })],
    });
    expect(finished.newPbs[0]).toMatchObject({ durationMs: 31_200, previousMs: 32_100 });
    expect((await pbOf(athlete.id, discipline.id))?.sourceType).toBe("COMPETITION");

    // Hapus hasil → PB kembali ke time trial.
    await saveResults(coach.actor, {
      competitionId: competition.id,
      round: "TIME_FINAL",
      rows: [row({ status: "" })],
    });
    expect((await pbOf(athlete.id, discipline.id))?.durationMs).toBe(32_100);

    expect(
      await errorCode(
        saveResults(otherCoach.actor, {
          competitionId: competition.id,
          round: "TIME_FINAL",
          rows: [row({ time: "20.00" })],
        }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("hasil tidak bisa dicatat sebelum event dimulai", async () => {
    const upcoming = await createCompetition({
      createdById: admin.userId,
      disciplineIds: [discipline.id],
      startsInDays: 10,
    });
    expect(
      await errorCode(
        saveResults(admin, { competitionId: upcoming.id, round: "TIME_FINAL", rows: [] as never }),
      ),
    ).toBe("CONFLICT");
  });
});
