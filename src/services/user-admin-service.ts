import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth/auth";
import type { CurrentUser } from "@/lib/auth/session";
import { generateTemporaryPassword } from "@/lib/auth/temporary-password";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { dateOnly, emptyToNull } from "@/lib/validations/common";
import type {
  CreateUserInput,
  SetUserRoleInput,
  SetUserStatusInput,
  UpdateUserAccountInput,
  UserListFilter,
} from "@/lib/validations/users";
import { writeAuditLog } from "@/services/audit-log-service";
import { revokeTrustedDevices } from "@/services/mfa-service";

// Semua fungsi di sini dipanggil dari Server Action yang sudah lolos requireAdmin().
// Operasi akun (buat, ban, role) lewat API admin Better Auth dengan header request admin,
// sehingga Better Auth ikut memeriksa izin dan mencabut session bila perlu.

export const USER_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function listUsers(filter: UserListFilter) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    role: filter.role,
    status: filter.status,
    ...(filter.q && {
      OR: [
        { name: { contains: filter.q, mode: "insensitive" } },
        { email: { contains: filter.q, mode: "insensitive" } },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      skip: (filter.page - 1) * USER_PAGE_SIZE,
      take: USER_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
      },
    }),
  ]);

  return { items, total, page: filter.page, pageSize: USER_PAGE_SIZE };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      banReason: true,
      twoFactorEnabled: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      athleteProfile: { select: { id: true, athleteNumber: true, fullName: true } },
      coachProfile: { select: { id: true, fullName: true } },
      _count: { select: { sessions: true } },
    },
  });
  if (!user) throw new AppError("NOT_FOUND", "Pengguna tidak ditemukan.");
  return user;
}

export async function getUserCounts() {
  const [athletes, coaches, groups, inactiveUsers] = await prisma.$transaction([
    prisma.athleteProfile.count({ where: { deletedAt: null, isActive: true } }),
    prisma.coachProfile.count({ where: { deletedAt: null, isActive: true } }),
    prisma.trainingGroup.count(),
    prisma.user.count({ where: { deletedAt: null, status: { not: "ACTIVE" } } }),
  ]);
  return { athletes, coaches, groups, inactiveUsers };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function betterAuthErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("body" in error)) return undefined;
  const body = (error as { body?: { code?: unknown } }).body;
  return typeof body?.code === "string" ? body.code : undefined;
}

async function assertEmailAvailable(email: string, exceptUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== exceptUserId) {
    throw new AppError("CONFLICT", "Email sudah dipakai akun lain.", "email");
  }
}

export async function createUser(
  admin: CurrentUser,
  input: CreateUserInput,
  requestHeaders: Headers,
): Promise<{ userId: string; temporaryPassword: string }> {
  await assertEmailAvailable(input.email);

  if (input.role === "ATHLETE") {
    const taken = await prisma.athleteProfile.findUnique({
      where: { athleteNumber: input.athleteNumber },
      select: { id: true },
    });
    if (taken) throw new AppError("CONFLICT", "Nomor atlet sudah dipakai.", "athleteNumber");
  }
  const trainingGroupId = emptyToNull(input.trainingGroupId);
  if (input.role === "ATHLETE" && trainingGroupId) {
    const group = await prisma.trainingGroup.findUnique({ where: { id: trainingGroupId } });
    if (!group)
      throw new AppError(
        "VALIDATION_ERROR",
        "Kelompok latihan tidak ditemukan.",
        "trainingGroupId",
      );
  }

  const temporaryPassword = generateTemporaryPassword();
  let userId: string;
  try {
    const result = await auth.api.createUser({
      body: { email: input.email, name: input.name, password: temporaryPassword, role: input.role },
      headers: requestHeaders,
    });
    userId = result.user.id;
  } catch (error) {
    if (betterAuthErrorCode(error)?.startsWith("USER_ALREADY_EXISTS")) {
      throw new AppError("CONFLICT", "Email sudah dipakai akun lain.", "email");
    }
    throw error;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Password awal dibuat admin: wajib diganti pengguna saat login pertama.
      await tx.user.update({ where: { id: userId }, data: { mustChangePassword: true } });
      if (input.role === "ATHLETE") {
        await tx.athleteProfile.create({
          data: {
            userId,
            fullName: input.name,
            athleteNumber: input.athleteNumber,
            birthDate: dateOnly(input.birthDate),
            joinDate: dateOnly(input.joinDate),
            gender: input.gender as "MALE" | "FEMALE",
            phone: emptyToNull(input.phone),
            trainingGroupId,
          },
        });
      } else if (input.role === "COACH") {
        await tx.coachProfile.create({
          data: {
            userId,
            fullName: input.name,
            phone: emptyToNull(input.phone),
            specialization: emptyToNull(input.specialization),
          },
        });
      }
      await writeAuditLog(tx, {
        actorUserId: admin.id,
        action: "user.created",
        entityType: "User",
        entityId: userId,
        metadata: { role: input.role, email: input.email },
      });
    });
  } catch (error) {
    // Profil gagal dibuat (mis. nomor atlet bentrok di saat bersamaan): hapus akun agar tidak setengah jadi.
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    throw error;
  }

  return { userId, temporaryPassword };
}

export async function updateUserAccount(
  admin: CurrentUser,
  input: UpdateUserAccountInput,
  requestHeaders: Headers,
) {
  const before = await getUserDetail(input.userId);
  await assertEmailAvailable(input.email, input.userId);

  await auth.api.adminUpdateUser({
    body: { userId: input.userId, data: { name: input.name, email: input.email } },
    headers: requestHeaders,
  });
  await writeAuditLog(prisma, {
    actorUserId: admin.id,
    action: "user.updated",
    entityType: "User",
    entityId: input.userId,
    metadata: {
      ...(before.name !== input.name && { name: { from: before.name, to: input.name } }),
      ...(before.email !== input.email && { email: { from: before.email, to: input.email } }),
    },
  });
}

async function assertNotLastActiveAdmin(userId: string, change: string) {
  const otherActiveAdmins = await prisma.user.count({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null, id: { not: userId } },
  });
  if (otherActiveAdmins === 0) {
    throw new AppError("CONFLICT", `Tidak bisa ${change}: ini satu-satunya admin aktif.`);
  }
}

export async function setUserStatus(
  admin: CurrentUser,
  input: SetUserStatusInput,
  requestHeaders: Headers,
) {
  if (input.userId === admin.id) {
    throw new AppError("FORBIDDEN", "Tidak bisa mengubah status akun sendiri.");
  }
  const target = await getUserDetail(input.userId);
  if (target.status === input.status) return;
  if (target.role === "ADMIN" && input.status !== "ACTIVE") {
    await assertNotLastActiveAdmin(target.id, "menonaktifkan akun ini");
  }

  // `banned` adalah mekanisme blokir login Better Auth (sekaligus mencabut session);
  // `status` adalah label domain. Keduanya selalu diubah bersamaan (doc/DATABASE.md).
  if (input.status === "ACTIVE") {
    await auth.api.unbanUser({ body: { userId: target.id }, headers: requestHeaders });
  } else {
    await auth.api.banUser({
      body: { userId: target.id, banReason: input.reason },
      headers: requestHeaders,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { status: input.status } });
    await writeAuditLog(tx, {
      actorUserId: admin.id,
      action: "user.status_changed",
      entityType: "User",
      entityId: target.id,
      metadata: { from: target.status, to: input.status, reason: input.reason || null },
    });
  });
}

const PROFILE_REQUIRED: Partial<Record<UserRole, "athleteProfile" | "coachProfile">> = {
  ATHLETE: "athleteProfile",
  COACH: "coachProfile",
};

export async function setUserRole(
  admin: CurrentUser,
  input: SetUserRoleInput,
  requestHeaders: Headers,
) {
  if (input.userId === admin.id) {
    throw new AppError("FORBIDDEN", "Tidak bisa mengubah role akun sendiri.");
  }
  const target = await getUserDetail(input.userId);
  if (target.role === input.role) return;
  if (target.role === "ADMIN") await assertNotLastActiveAdmin(target.id, "mengubah role");

  const requiredProfile = PROFILE_REQUIRED[input.role];
  if (requiredProfile && !target[requiredProfile]) {
    throw new AppError(
      "CONFLICT",
      input.role === "ATHLETE"
        ? "Akun ini belum punya profil atlet. Buat akun atlet baru untuknya."
        : "Akun ini belum punya profil pelatih. Buat akun pelatih baru untuknya.",
    );
  }

  await auth.api.setRole({
    body: { userId: target.id, role: input.role },
    headers: requestHeaders,
  });

  await prisma.$transaction(async (tx) => {
    // Perangkat tepercaya lama tidak boleh melewati MFA wajib admin.
    if (input.role === "ADMIN") await revokeTrustedDevices(tx, target.id);
    await writeAuditLog(tx, {
      actorUserId: admin.id,
      action: "user.role_changed",
      entityType: "User",
      entityId: target.id,
      metadata: { from: target.role, to: input.role },
    });
  });
}

// Admin membuat password sementara baru (pengguna lupa password). Semua session pengguna dicabut,
// dan pengguna wajib membuat password sendiri saat login berikutnya.
export async function resetUserPassword(
  admin: CurrentUser,
  userId: string,
  requestHeaders: Headers,
): Promise<{ email: string; temporaryPassword: string }> {
  if (userId === admin.id) {
    throw new AppError(
      "FORBIDDEN",
      "Untuk akunmu sendiri, gunakan Ganti password di menu Keamanan.",
    );
  }
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!user) throw new AppError("NOT_FOUND", "Pengguna tidak ditemukan.");

  const temporaryPassword = generateTemporaryPassword();
  await auth.api.setUserPassword({
    body: { userId: user.id, newPassword: temporaryPassword },
    headers: requestHeaders,
  });
  await auth.api.revokeUserSessions({ body: { userId: user.id }, headers: requestHeaders });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { mustChangePassword: true } });
    await writeAuditLog(tx, {
      actorUserId: admin.id,
      action: "user.password_reset",
      entityType: "User",
      entityId: user.id,
    });
  });
  return { email: user.email, temporaryPassword };
}
