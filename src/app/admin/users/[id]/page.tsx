import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL, USER_STATUS_LABEL } from "@/constants/labels";
import {
  ResetMfaControl,
  UserAccountForm,
  UserRoleControl,
  UserStatusControl,
} from "@/features/users/user-detail-controls";
import { userStatusTone } from "@/features/users/user-status";
import { requireAdmin } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { getUserDetail } from "@/services/user-admin-service";

export const metadata: Metadata = { title: "Detail Pengguna" };

export default function UserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserDetail params={params} />
    </Suspense>
  );
}

async function loadUser(userId: string) {
  try {
    return await getUserDetail(userId);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

async function UserDetail({ params }: { params: PageProps<"/admin/users/[id]">["params"] }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await loadUser(id);
  const isSelf = user.id === admin.id;
  const profileHref = user.athleteProfile
    ? `/admin/athletes/${user.athleteProfile.id}`
    : user.coachProfile
      ? `/admin/coaches/${user.coachProfile.id}`
      : null;

  return (
    <>
      <PageHeader title={user.name} description={user.email} />

      {isSelf && (
        <Alert>
          <AlertDescription>
            Ini akun kamu sendiri. Status, role, dan MFA akun sendiri hanya bisa diubah oleh admin
            lain.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="self-start lg:col-span-1">
          <CardHeader>
            <CardTitle>Ringkasan akun</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Role</dt>
              <dd>{ROLE_LABEL[user.role]}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge tone={userStatusTone(user.status)}>
                  {USER_STATUS_LABEL[user.status]}
                </StatusBadge>
                {user.banReason && user.status !== "ACTIVE" && (
                  <p className="mt-1 text-xs text-muted-foreground">Alasan: {user.banReason}</p>
                )}
              </dd>
              <dt className="text-muted-foreground">MFA</dt>
              <dd>{user.twoFactorEnabled ? "Aktif" : "Tidak aktif"}</dd>
              <dt className="text-muted-foreground">Login terakhir</dt>
              <dd>{formatDateTime(user.lastLoginAt)}</dd>
              <dt className="text-muted-foreground">Sesi aktif</dt>
              <dd className="numeric">{user._count.sessions}</dd>
              <dt className="text-muted-foreground">Dibuat</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
              {profileHref && (
                <>
                  <dt className="text-muted-foreground">Profil</dt>
                  <dd>
                    <Link
                      href={profileHref}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {user.athleteProfile
                        ? `Atlet ${user.athleteProfile.athleteNumber}`
                        : "Profil pelatih"}
                    </Link>
                  </dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Data akun</CardTitle>
              <CardDescription>Nama tampilan dan email yang dipakai untuk masuk.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserAccountForm user={{ id: user.id, name: user.name, email: user.email }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Akses</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <UserStatusControl userId={user.id} status={user.status} disabled={isSelf} />
              <UserRoleControl userId={user.id} role={user.role} disabled={isSelf} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verifikasi dua langkah</CardTitle>
              <CardDescription>
                {user.twoFactorEnabled
                  ? "Reset jika pengguna kehilangan HP dan recovery code. Pengguna harus mengaktifkan MFA lagi."
                  : "Pengguna belum mengaktifkan MFA."}
              </CardDescription>
            </CardHeader>
            {user.twoFactorEnabled && (
              <CardContent className="flex flex-col">
                <ResetMfaControl userId={user.id} disabled={isSelf} />
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
