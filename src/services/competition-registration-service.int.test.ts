import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
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

import {
  cancelRegistration,
  getRegistrationBoard,
  getRoster,
  listAthleteEvents,
  saveRegistration,
} from "./competition-registration-service";

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(isAppError(error) ? error.code : error).toBe(code);
}

describe("pendaftaran event", () => {
  let admin: Actor;
  let coach: Awaited<ReturnType<typeof createCoach>>;
  let otherCoach: Awaited<ReturnType<typeof createCoach>>;
  let athlete: Awaited<ReturnType<typeof createAthlete>>;
  let teammate: Awaited<ReturnType<typeof createAthlete>>;
  let outsider: Awaited<ReturnType<typeof createAthlete>>;
  let free: Awaited<ReturnType<typeof createDiscipline>>;
  let back: Awaited<ReturnType<typeof createDiscipline>>;
  let fly: Awaited<ReturnType<typeof createDiscipline>>;
  let notOpen: Awaited<ReturnType<typeof createDiscipline>>;
  let competitionId: string;

  beforeEach(async () => {
    admin = await createAdmin();
    coach = await createCoach();
    otherCoach = await createCoach();
    const group = await createGroup(coach.id);
    const otherGroup = await createGroup(otherCoach.id);
    athlete = await createAthlete({ groupId: group.id });
    teammate = await createAthlete({ groupId: group.id, gender: "FEMALE" });
    outsider = await createAthlete({ groupId: otherGroup.id });
    [free, back, fly, notOpen] = await Promise.all([
      createDiscipline(),
      createDiscipline(),
      createDiscipline(),
      createDiscipline(),
    ]);
    await prisma.personalBest.create({
      data: {
        athleteId: athlete.id,
        disciplineId: free.id,
        durationMs: 31_450,
        achievedAt: new Date(),
        sourceType: "TIME_TRIAL",
        sourceId: "seed",
      },
    });
    const competition = await createCompetition({
      createdById: admin.userId,
      disciplineIds: [free.id, back.id, fly.id],
      maxEntriesPerAthlete: 2,
    });
    competitionId = competition.id;
  });

  const register = (actor: Actor, athleteId: string, disciplineIds: string[], now?: Date) =>
    saveRegistration(actor, { competitionId, athleteId, disciplineIds }, now);

  it("atlet mendaftar sendiri; seed time diambil dari PB", async () => {
    expect((await register(athlete.actor, athlete.id, [free.id])).outcome).toBe("created");
    const entry = await prisma.competitionEntry.findFirstOrThrow({
      where: { athleteId: athlete.id },
    });
    expect(entry.seedTimeMs).toBe(31_450);
  });

  it("tanpa perubahan → unchanged; tambah nomor → updated", async () => {
    await register(athlete.actor, athlete.id, [free.id]);
    expect((await register(athlete.actor, athlete.id, [free.id])).outcome).toBe("unchanged");
    expect((await register(athlete.actor, athlete.id, [free.id, back.id])).outcome).toBe("updated");
  });

  it("menolak nomor yang tidak dibuka dan melebihi batas", async () => {
    await expectCode(register(athlete.actor, athlete.id, [notOpen.id]), "VALIDATION_ERROR");
    await expectCode(
      register(athlete.actor, athlete.id, [free.id, back.id, fly.id]),
      "VALIDATION_ERROR",
    );
  });

  it("atlet tidak bisa mendaftarkan atlet lain (IDOR)", async () => {
    await expectCode(register(athlete.actor, teammate.id, [free.id]), "FORBIDDEN");
  });

  it("pelatih hanya atlet binaannya", async () => {
    expect((await register(coach.actor, teammate.id, [free.id])).outcome).toBe("created");
    await expectCode(register(coach.actor, outsider.id, [free.id]), "FORBIDDEN");
    const board = await getRegistrationBoard(coach.actor, competitionId);
    expect(board.athletes.map((a) => a.id).sort()).toEqual([athlete.id, teammate.id].sort());
  });

  it("setelah deadline hanya admin yang bisa mengubah", async () => {
    await register(athlete.actor, athlete.id, [free.id]);
    const later = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    await expectCode(register(athlete.actor, athlete.id, [back.id], later), "CONFLICT");
    await expectCode(
      cancelRegistration(coach.actor, { competitionId, athleteId: athlete.id }, later),
      "CONFLICT",
    );
    expect((await register(admin, athlete.id, [back.id], later)).outcome).toBe("updated");
  });

  it("atlet nonaktif tidak bisa didaftarkan", async () => {
    await prisma.athleteProfile.update({ where: { id: teammate.id }, data: { isActive: false } });
    await expectCode(register(coach.actor, teammate.id, [free.id]), "CONFLICT");
  });

  it("event DRAFT: tidak terlihat atlet, pelatih pembuatnya tidak bisa mendaftar", async () => {
    const draft = await createCompetition({
      createdById: coach.actor.userId,
      disciplineIds: [free.id],
      status: "DRAFT",
    });
    await expectCode(
      saveRegistration(athlete.actor, {
        competitionId: draft.id,
        athleteId: athlete.id,
        disciplineIds: [free.id],
      }),
      "NOT_FOUND",
    );
    await expectCode(
      saveRegistration(coach.actor, {
        competitionId: draft.id,
        athleteId: athlete.id,
        disciplineIds: [free.id],
      }),
      "CONFLICT",
    );
    const events = await listAthleteEvents(athlete.actor);
    expect(events.map((e) => e.id)).not.toContain(draft.id);
  });

  it("batal lalu daftar ulang mengaktifkan kembali pendaftaran", async () => {
    await register(athlete.actor, athlete.id, [free.id]);
    await cancelRegistration(athlete.actor, { competitionId, athleteId: athlete.id });
    await expectCode(
      cancelRegistration(athlete.actor, { competitionId, athleteId: athlete.id }),
      "NOT_FOUND",
    );
    expect((await register(athlete.actor, athlete.id, [back.id])).outcome).toBe("created");
    const registration = await prisma.competitionRegistration.findFirstOrThrow({
      where: { athleteId: athlete.id },
      include: { entries: true },
    });
    expect(registration.status).toBe("REGISTERED");
    expect(registration.cancelledAt).toBeNull();
    expect(registration.entries.map((e) => e.disciplineId)).toEqual([back.id]);
  });

  it("notifikasi ke admin lain + audit log", async () => {
    const secondAdmin = await createAdmin("Admin Kedua");
    await register(athlete.actor, athlete.id, [free.id]);
    await register(admin, teammate.id, [free.id]);
    // Admin pelaku tidak menerima notifikasi atas aksinya sendiri.
    expect(await prisma.notification.count({ where: { userId: admin.userId } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: secondAdmin.userId } })).toBe(2);
    expect(
      await prisma.auditLog.count({ where: { action: "competition_registration.created" } }),
    ).toBe(2);
  });

  it("rekap: hanya admin, filter & ringkasan", async () => {
    await register(athlete.actor, athlete.id, [free.id, back.id]);
    await register(coach.actor, teammate.id, [free.id]);
    await expectCode(getRoster(coach.actor, competitionId), "FORBIDDEN");

    const roster = await getRoster(admin, competitionId);
    expect(roster.summary).toMatchObject({ athletes: 2, entries: 3 });
    expect(roster.summary.perDiscipline[free.id]).toBe(2);

    const female = await getRoster(admin, competitionId, {
      view: "athlete",
      discipline: "",
      gender: "FEMALE",
      q: "",
      cancelled: false,
    });
    expect(female.rows.map((r) => r.athlete.id)).toEqual([teammate.id]);
  });
});
