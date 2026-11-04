import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { isAppError } from "@/lib/errors";
import { createAdmin, createAthlete, createCoach, createGroup } from "@/test/factories";

// Storage di-mock: isi file diatur per test lewat `uploaded`.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const storage = vi.hoisted(() => ({
  uploaded: null as Uint8Array | null,
  removed: [] as string[],
}));

vi.mock("@/lib/storage/supabase", () => ({
  paymentProofs: () => ({
    createSignedUploadUrl: async () => ({ data: { signedUrl: "https://storage.test/up" } }),
    createSignedUrl: async (key: string) => ({
      data: { signedUrl: `https://storage.test/${key}` },
    }),
    download: async () =>
      storage.uploaded
        ? { data: new Blob([storage.uploaded as BlobPart]) }
        : { error: { message: "not found" } },
    remove: async (keys: string[]) => {
      storage.removed.push(...keys);
      return {};
    },
  }),
}));

const {
  approvePayment,
  cancelPayment,
  getAthleteSppHistory,
  getMonthlyBoard,
  getProofUrl,
  listPendingPayments,
  recordPayment,
  rejectPayment,
  requestProofUpload,
  setRate,
  submitPayment,
} = await import("./spp-service");

const NOW = new Date("2026-06-15T04:00:00Z");
const UUID = "123e4567-e89b-12d3-a456-426614174000";
const proofKey = (athleteId: string, month: string) => `spp/${athleteId}/${month}/${UUID}.jpg`;

const FILTER = { group: "", q: "", page: 1, month: undefined, status: undefined };
const PAYMENT = { amount: 250_000, method: "TRANSFER" as const, paidOn: "2026-06-10", note: "" };

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(isAppError(error) && error.code).toBe(code);
}

async function setup() {
  const admin = await createAdmin();
  const coach = await createCoach();
  const otherCoach = await createCoach();
  const group = await createGroup(coach.id);
  const otherGroup = await createGroup(otherCoach.id);
  const athlete = await createAthlete({ groupId: group.id });
  const other = await createAthlete({ groupId: otherGroup.id });
  await setRate(admin, { month: "2026-01", amount: 250_000 }, NOW);
  return { admin, coach, otherCoach, athlete, other };
}

function submit(athlete: Awaited<ReturnType<typeof createAthlete>>, month = "2026-06") {
  return submitPayment(
    athlete.actor,
    { ...PAYMENT, month, proofKey: proofKey(athlete.id, month), proofName: "bukti.jpg" },
    NOW,
  );
}

beforeEach(() => {
  storage.uploaded = JPEG;
  storage.removed = [];
});

describe("tarif", () => {
  it("hanya admin yang boleh mengatur", async () => {
    const { coach, athlete } = await setup();
    const input = { month: "2026-07", amount: 300_000 };
    await expectCode(setRate(coach.actor, input, NOW), "FORBIDDEN");
    await expectCode(setRate(athlete.actor, input, NOW), "FORBIDDEN");
  });

  it("perubahan tarif tidak mengubah nominal yang sudah dicatat", async () => {
    const { admin, athlete } = await setup();
    await recordPayment(admin, { ...PAYMENT, athleteId: athlete.id, month: "2026-05" }, NOW);
    await setRate(admin, { month: "2026-05", amount: 400_000 }, NOW);

    const history = await getAthleteSppHistory(admin, athlete.id, NOW);
    const may = history.rows.find((row) => row.month === "2026-05");
    expect(may?.payment?.amount).toBe(250_000);
    expect(may?.expectedAmount).toBe(400_000);
  });
});

describe("mencatat pembayaran", () => {
  it("pelatih hanya untuk atlet binaan", async () => {
    const { coach, athlete, other } = await setup();
    await recordPayment(coach.actor, { ...PAYMENT, athleteId: athlete.id, month: "2026-06" }, NOW);
    await expectCode(
      recordPayment(coach.actor, { ...PAYMENT, athleteId: other.id, month: "2026-06" }, NOW),
      "FORBIDDEN",
    );
  });

  it("atlet tidak bisa mencatat lunas, termasuk untuk dirinya sendiri", async () => {
    const { athlete } = await setup();
    await expectCode(
      recordPayment(athlete.actor, { ...PAYMENT, athleteId: athlete.id, month: "2026-06" }, NOW),
      "FORBIDDEN",
    );
  });

  it("menolak bulan lunas, bulan sebelum tagihan, dan tanggal masa depan", async () => {
    const { admin, athlete } = await setup();
    const input = { ...PAYMENT, athleteId: athlete.id, month: "2026-06" };
    await recordPayment(admin, input, NOW);
    await expectCode(recordPayment(admin, input, NOW), "CONFLICT");
    await expectCode(recordPayment(admin, { ...input, month: "2025-12" }, NOW), "VALIDATION_ERROR");
    await expectCode(
      recordPayment(admin, { ...input, month: "2026-07", paidOn: "2026-06-20" }, NOW),
      "VALIDATION_ERROR",
    );
  });

  it("gagal jelas bila tarif belum diatur", async () => {
    const admin = await createAdmin();
    const athlete = await createAthlete();
    await expectCode(
      recordPayment(admin, { ...PAYMENT, athleteId: athlete.id, month: "2026-06" }, NOW),
      "CONFLICT",
    );
  });
});

describe("pengajuan atlet", () => {
  it("masuk Menunggu, memberi notifikasi admin, lalu bisa disetujui pelatih", async () => {
    const { admin, coach, athlete } = await setup();
    await submit(athlete);

    expect(await prisma.notification.count({ where: { userId: admin.userId } })).toBe(1);
    const [pending] = await listPendingPayments(coach.actor);
    expect(pending?.status).toBe("PENDING");

    await approvePayment(coach.actor, pending!.id, NOW);
    const row = await prisma.sppPayment.findUniqueOrThrow({ where: { id: pending!.id } });
    expect(row.status).toBe("PAID");
    expect(row.reviewedById).toBe(coach.actor.userId);
  });

  it("key bukti milik atlet lain ditolak", async () => {
    const { athlete, other } = await setup();
    await expectCode(
      submitPayment(
        athlete.actor,
        {
          ...PAYMENT,
          month: "2026-06",
          proofKey: proofKey(other.id, "2026-06"),
          proofName: "bukti.jpg",
        },
        NOW,
      ),
      "VALIDATION_ERROR",
    );
  });

  it("isi file palsu ditolak dan objeknya dihapus", async () => {
    const { athlete } = await setup();
    storage.uploaded = new TextEncoder().encode("bukan gambar sama sekali");
    await expectCode(submit(athlete), "VALIDATION_ERROR");
    expect(storage.removed).toEqual([proofKey(athlete.id, "2026-06")]);
    expect(await prisma.sppPayment.count()).toBe(0);
  });

  it("tidak bisa menimpa status Lunas", async () => {
    const { admin, athlete } = await setup();
    await recordPayment(admin, { ...PAYMENT, athleteId: athlete.id, month: "2026-06" }, NOW);
    await expectCode(submit(athlete), "CONFLICT");
    const row = await prisma.sppPayment.findFirstOrThrow();
    expect(row.status).toBe("PAID");
  });

  it("ditolak bisa diajukan ulang dan alasannya terhapus", async () => {
    const { admin, athlete } = await setup();
    await submit(athlete);
    const payment = await prisma.sppPayment.findFirstOrThrow();
    await rejectPayment(admin, payment.id, "Foto buram", NOW);
    expect((await prisma.sppPayment.findFirstOrThrow()).reviewNote).toBe("Foto buram");

    await submit(athlete);
    const resubmitted = await prisma.sppPayment.findFirstOrThrow();
    expect(resubmitted.status).toBe("PENDING");
    expect(resubmitted.reviewNote).toBeNull();
    expect(await prisma.sppPayment.count()).toBe(1);
  });

  it("menghapus bukti lama saat diganti", async () => {
    const { athlete } = await setup();
    await submit(athlete);
    const replacement = `spp/${athlete.id}/2026-06/923e4567-e89b-12d3-a456-426614174000.jpg`;
    await submitPayment(
      athlete.actor,
      { ...PAYMENT, month: "2026-06", proofKey: replacement, proofName: "baru.jpg" },
      NOW,
    );
    expect(storage.removed).toEqual([proofKey(athlete.id, "2026-06")]);
  });

  it("admin & pelatih tidak bisa mengajukan lewat jalur atlet", async () => {
    const { admin, coach, athlete } = await setup();
    const input = {
      ...PAYMENT,
      month: "2026-06",
      proofKey: proofKey(athlete.id, "2026-06"),
      proofName: "bukti.jpg",
    };
    await expectCode(submitPayment(admin, input, NOW), "FORBIDDEN");
    await expectCode(submitPayment(coach.actor, input, NOW), "FORBIDDEN");
  });

  it("signed upload hanya untuk atlet yang berhak", async () => {
    const { coach, athlete, other } = await setup();
    const meta = { month: "2026-06", size: 1000, type: "image/jpeg" };
    const ticket = await requestProofUpload(athlete.actor, { ...meta, athleteId: athlete.id }, NOW);
    expect(ticket.key.startsWith(`spp/${athlete.id}/2026-06/`)).toBe(true);
    await expectCode(
      requestProofUpload(athlete.actor, { ...meta, athleteId: other.id }, NOW),
      "FORBIDDEN",
    );
    await expectCode(
      requestProofUpload(coach.actor, { ...meta, athleteId: other.id }, NOW),
      "FORBIDDEN",
    );
  });
});

describe("konfirmasi", () => {
  it("setujui hanya dari Menunggu, aksi ganda ditolak", async () => {
    const { admin, athlete } = await setup();
    await submit(athlete);
    const payment = await prisma.sppPayment.findFirstOrThrow();
    await approvePayment(admin, payment.id, NOW);
    await expectCode(approvePayment(admin, payment.id, NOW), "CONFLICT");
    await expectCode(rejectPayment(admin, payment.id, "Terlambat", NOW), "CONFLICT");
  });

  it("pelatih lain dan atlet tidak bisa memproses", async () => {
    const { otherCoach, athlete } = await setup();
    await submit(athlete);
    const payment = await prisma.sppPayment.findFirstOrThrow();
    await expectCode(approvePayment(otherCoach.actor, payment.id, NOW), "NOT_FOUND");
    await expectCode(approvePayment(athlete.actor, payment.id, NOW), "FORBIDDEN");
  });

  it("batalkan lunas mengembalikan ke belum bayar dan bisa dicatat ulang", async () => {
    const { admin, athlete } = await setup();
    const input = { ...PAYMENT, athleteId: athlete.id, month: "2026-06" };
    await recordPayment(admin, input, NOW);
    const payment = await prisma.sppPayment.findFirstOrThrow();
    await cancelPayment(admin, payment.id, "Salah atlet", NOW);

    const board = await getMonthlyBoard(admin, { ...FILTER, status: "UNPAID" }, NOW);
    expect(board.rows.map((row) => row.athleteId)).toContain(athlete.id);

    await recordPayment(admin, input, NOW);
    expect((await prisma.sppPayment.findFirstOrThrow()).status).toBe("PAID");
    expect(await prisma.auditLog.count({ where: { action: "spp_payment.cancelled" } })).toBe(1);
  });
});

describe("papan & riwayat", () => {
  it("pelatih hanya melihat binaan; total hanya menghitung Lunas", async () => {
    const { admin, coach, athlete, other } = await setup();
    await recordPayment(admin, { ...PAYMENT, athleteId: athlete.id, month: "2026-06" }, NOW);
    await recordPayment(
      admin,
      { ...PAYMENT, athleteId: other.id, month: "2026-06", amount: 100_000 },
      NOW,
    );

    const coachBoard = await getMonthlyBoard(coach.actor, FILTER, NOW);
    expect(coachBoard.rows.map((row) => row.athleteId)).toEqual([athlete.id]);
    expect(coachBoard.summary).toMatchObject({ paid: 1, unpaid: 0, received: 250_000 });

    const adminBoard = await getMonthlyBoard(admin, FILTER, NOW);
    expect(adminBoard.summary).toMatchObject({ paid: 2, received: 350_000 });
  });

  it("Menunggu tidak masuk total dan tidak dihitung menunggak", async () => {
    const { admin, athlete } = await setup();
    await submit(athlete, "2026-05");
    const board = await getMonthlyBoard(admin, { ...FILTER, month: "2026-05" }, NOW);
    expect(board.summary).toMatchObject({ pending: 1, received: 0 });

    const history = await getAthleteSppHistory(admin, athlete.id, NOW);
    expect(history.arrears).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
  });

  it("atlet nonaktif tidak ditagih dan bulan sebelum tarif kosong", async () => {
    const { admin } = await setup();
    const inactive = await createAthlete({ isActive: false, name: "Nonaktif" });
    const board = await getMonthlyBoard(admin, FILTER, NOW);
    expect(board.rows.map((row) => row.athleteId)).not.toContain(inactive.id);

    const before = await getMonthlyBoard(admin, { ...FILTER, month: "2025-12" }, NOW);
    expect(before.billed).toBe(false);
    expect(before.rows).toEqual([]);
  });

  it("riwayat & bukti atlet lain tertutup", async () => {
    const { coach, athlete, other } = await setup();
    await submit(athlete);
    const payment = await prisma.sppPayment.findFirstOrThrow();

    await expectCode(getAthleteSppHistory(other.actor, athlete.id, NOW), "FORBIDDEN");
    await expectCode(getProofUrl(other.actor, payment.id), "NOT_FOUND");
    expect(await getProofUrl(athlete.actor, payment.id)).toContain(athlete.id);
    expect(await getProofUrl(coach.actor, payment.id)).toContain(athlete.id);
  });
});
