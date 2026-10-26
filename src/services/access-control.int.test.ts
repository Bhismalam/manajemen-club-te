import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { isAppError } from "@/lib/errors";
import { requireAthleteAccess } from "@/lib/permissions/guards";
import type { Actor } from "@/lib/permissions/types";
import {
  createAdmin,
  createAthlete,
  createCoach,
  createCompetition,
  createDiscipline,
  createGroup,
} from "@/test/factories";

import { listAthletes } from "./athlete-service";
import { saveSessionAttendance } from "./attendance-service";
import {
  getCompetition,
  listCompetitions,
  setCompetitionStatus,
  updateCompetition,
} from "./competition-service";
import { createEvaluation, getEvaluation, updateEvaluation } from "./evaluation-service";
import { getTrainingSession } from "./training-session-service";

async function errorCode(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  return isAppError(error) ? error.code : error === null ? "OK" : String(error);
}

let admin: Actor;
let coachA: Awaited<ReturnType<typeof createCoach>>;
let coachB: Awaited<ReturnType<typeof createCoach>>;
let groupA: Awaited<ReturnType<typeof createGroup>>;
let groupB: Awaited<ReturnType<typeof createGroup>>;
let athleteA: Awaited<ReturnType<typeof createAthlete>>;
let athleteB: Awaited<ReturnType<typeof createAthlete>>;

beforeEach(async () => {
  admin = await createAdmin();
  coachA = await createCoach("Pelatih A");
  coachB = await createCoach("Pelatih B");
  groupA = await createGroup(coachA.id, "Kelompok A");
  groupB = await createGroup(coachB.id, "Kelompok B");
  athleteA = await createAthlete({ groupId: groupA.id, name: "Atlet A" });
  athleteB = await createAthlete({ groupId: groupB.id, name: "Atlet B" });
});

describe("akses data atlet (RBAC + IDOR)", () => {
  it("atlet hanya dirinya sendiri", async () => {
    expect(await errorCode(requireAthleteAccess(athleteA.actor, athleteA.id, "view"))).toBe("OK");
    expect(await errorCode(requireAthleteAccess(athleteA.actor, athleteB.id, "view"))).toBe(
      "FORBIDDEN",
    );
    // Atlet tidak pernah boleh mengubah data performanya sendiri.
    expect(await errorCode(requireAthleteAccess(athleteA.actor, athleteA.id, "manage"))).toBe(
      "FORBIDDEN",
    );
  });

  it("pelatih hanya atlet binaannya; admin semua", async () => {
    expect(await errorCode(requireAthleteAccess(coachA.actor, athleteA.id, "manage"))).toBe("OK");
    expect(await errorCode(requireAthleteAccess(coachA.actor, athleteB.id, "view"))).toBe(
      "FORBIDDEN",
    );
    expect(await errorCode(requireAthleteAccess(admin, athleteB.id, "manage"))).toBe("OK");
  });

  it("pelatih tanpa profil aktif tidak melihat atlet mana pun", async () => {
    const orphan: Actor = { ...coachA.actor, coachId: null };
    expect(await errorCode(requireAthleteAccess(orphan, athleteA.id, "view"))).toBe("FORBIDDEN");
    const list = await listAthletes(orphan, { q: "", group: "", status: undefined, page: 1 });
    expect(list.total).toBe(0);
  });

  it("daftar atlet mengikuti scope", async () => {
    const filter = { q: "", group: "", status: undefined, page: 1 };
    expect((await listAthletes(coachA.actor, filter)).items.map((a) => a.id)).toEqual([
      athleteA.id,
    ]);
    expect((await listAthletes(athleteA.actor, filter)).items.map((a) => a.id)).toEqual([
      athleteA.id,
    ]);
    expect((await listAthletes(admin, filter)).total).toBe(2);
  });
});

describe("sesi latihan & absensi", () => {
  it("sesi kelompok lain tidak terlihat; absensi hanya oleh pelatih kelompoknya", async () => {
    const session = await prisma.trainingSession.create({
      data: {
        trainingGroupId: groupB.id,
        title: "Latihan B",
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 60 * 60 * 1000),
        createdById: coachB.actor.userId,
      },
    });
    expect(await errorCode(getTrainingSession(coachA.actor, session.id))).toBe("NOT_FOUND");
    expect(await errorCode(getTrainingSession(athleteA.actor, session.id))).toBe("NOT_FOUND");
    expect(await errorCode(getTrainingSession(athleteB.actor, session.id))).toBe("OK");

    const input = {
      sessionId: session.id,
      entries: [{ athleteId: athleteB.id, status: "PRESENT" as const, note: "" }],
    };
    expect(["NOT_FOUND", "FORBIDDEN"]).toContain(
      await errorCode(saveSessionAttendance(coachA.actor, input)),
    );
    expect(await errorCode(saveSessionAttendance(coachB.actor, input))).toBe("OK");
  });
});

describe("event", () => {
  it("draft hanya terlihat pembuatnya & admin; pelatih lain tidak bisa mengubah event terbit", async () => {
    const discipline = await createDiscipline();
    const draft = await createCompetition({
      createdById: coachA.actor.userId,
      disciplineIds: [discipline.id],
      status: "DRAFT",
    });
    expect(await errorCode(getCompetition(coachA.actor, draft.id))).toBe("OK");
    expect(await errorCode(getCompetition(admin, draft.id))).toBe("OK");
    expect(await errorCode(getCompetition(coachB.actor, draft.id))).toBe("NOT_FOUND");
    expect(await errorCode(getCompetition(athleteA.actor, draft.id))).toBe("NOT_FOUND");
    expect((await listCompetitions(coachB.actor, { q: "", page: 1 })).total).toBe(0);

    await setCompetitionStatus(coachA.actor, draft.id, "UPCOMING");
    expect(await errorCode(getCompetition(coachB.actor, draft.id))).toBe("OK");
    expect(await errorCode(setCompetitionStatus(coachB.actor, draft.id, "CANCELLED"))).toBe(
      "FORBIDDEN",
    );
  });

  it("publish ditolak tanpa nomor lomba; nomor ber-pendaftar terkunci", async () => {
    const [free, back] = await Promise.all([createDiscipline(), createDiscipline()]);
    const empty = await createCompetition({
      createdById: admin.userId,
      disciplineIds: [],
      status: "DRAFT",
    });
    expect(await errorCode(setCompetitionStatus(admin, empty.id, "UPCOMING"))).toBe("CONFLICT");

    const event = await createCompetition({
      createdById: admin.userId,
      disciplineIds: [free.id, back.id],
    });
    const registration = await prisma.competitionRegistration.create({
      data: { competitionId: event.id, athleteId: athleteA.id, registeredByUserId: admin.userId },
    });
    await prisma.competitionEntry.create({
      data: {
        registrationId: registration.id,
        competitionId: event.id,
        athleteId: athleteA.id,
        disciplineId: free.id,
      },
    });
    const base = {
      competitionId: event.id,
      name: event.name,
      description: "",
      location: event.location,
      level: event.level,
      startDate: event.startDate.toISOString().slice(0, 10),
      endDate: event.endDate.toISOString().slice(0, 10),
      registrationOpensDate: event.registrationOpensAt!.toISOString().slice(0, 10),
      registrationOpensTime: "00:00",
      registrationClosesDate: event.registrationClosesAt!.toISOString().slice(0, 10),
      registrationClosesTime: "00:00",
      maxEntriesPerAthlete: "",
    };
    expect(await errorCode(updateCompetition(admin, { ...base, disciplineIds: [back.id] }))).toBe(
      "CONFLICT",
    );
    expect(await errorCode(setCompetitionStatus(admin, event.id, "DRAFT"))).toBe("CONFLICT");
  });
});

describe("evaluasi", () => {
  const input = {
    evaluationDate: "2026-10-20",
    strengths: "Start kuat",
    weaknesses: "Pacing turun",
    focus: "Interval 4x100",
    target: "1:05.00",
    notes: "",
  };

  it("hanya pelatih pembina yang menulis; atlet & pelatih lain tidak bisa melihat/mengubah", async () => {
    expect(
      await errorCode(createEvaluation(coachB.actor, { ...input, athleteId: athleteA.id })),
    ).toBe("FORBIDDEN");
    expect(await errorCode(createEvaluation(admin, { ...input, athleteId: athleteA.id }))).toBe(
      "FORBIDDEN",
    );
    const { id } = await createEvaluation(coachA.actor, { ...input, athleteId: athleteA.id });
    expect(await errorCode(getEvaluation(coachB.actor, id))).toBe("NOT_FOUND");
    expect(await errorCode(getEvaluation(athleteB.actor, id))).toBe("NOT_FOUND");
    expect((await getEvaluation(athleteA.actor, id)).canEdit).toBe(false);
    expect(await errorCode(updateEvaluation(athleteA.actor, { ...input, evaluationId: id }))).toBe(
      "FORBIDDEN",
    );
  });

  it("atlet pindah kelompok: pelatih baru membaca tanpa mengubah, admin bisa mengoreksi", async () => {
    const { id } = await createEvaluation(coachA.actor, { ...input, athleteId: athleteA.id });
    await prisma.athleteProfile.update({
      where: { id: athleteA.id },
      data: { trainingGroupId: groupB.id },
    });
    expect(await errorCode(updateEvaluation(coachA.actor, { ...input, evaluationId: id }))).toBe(
      "NOT_FOUND",
    );
    expect((await getEvaluation(coachB.actor, id)).canEdit).toBe(false);
    expect(
      await updateEvaluation(admin, { ...input, evaluationId: id, notes: "koreksi admin" }),
    ).toEqual({ changed: true });
  });
});
