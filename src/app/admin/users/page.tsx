import { ShieldUser, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { PaginationLinks } from "@/components/shared/pagination-links";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABEL, USER_STATUS_LABEL } from "@/constants/labels";
import { userStatusTone } from "@/features/users/user-status";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { ROLE_VALUES, USER_STATUS_VALUES } from "@/lib/validations/common";
import { userListFilterSchema } from "@/lib/validations/users";
import { listUsers } from "@/services/user-admin-service";

export const metadata: Metadata = { title: "Pengguna" };

export default function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Akun admin, pelatih, dan atlet yang bisa masuk ke sistem."
        actions={
          <Link href="/admin/users/new" className={buttonVariants()}>
            <UserPlus />
            Tambah pengguna
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <UserList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function UserList({
  searchParams,
}: {
  searchParams: PageProps<"/admin/users">["searchParams"];
}) {
  await requireAdmin();
  const filter = userListFilterSchema.parse(await searchParams);
  const { items, total, page, pageSize } = await listUsers(filter);
  const isFiltered = Boolean(filter.q || filter.role || filter.status);

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="q">
          Cari nama atau email
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={filter.q}
          placeholder="Cari nama atau email"
          className="sm:max-w-xs"
        />
        <label className="sr-only" htmlFor="role">
          Role
        </label>
        <NativeSelect id="role" name="role" defaultValue={filter.role ?? ""}>
          <NativeSelectOption value="">Semua role</NativeSelectOption>
          {ROLE_VALUES.map((role) => (
            <NativeSelectOption key={role} value={role}>
              {ROLE_LABEL[role]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <NativeSelect id="status" name="status" defaultValue={filter.status ?? ""}>
          <NativeSelectOption value="">Semua status</NativeSelectOption>
          {USER_STATUS_VALUES.map((status) => (
            <NativeSelectOption key={status} value={status}>
              {USER_STATUS_LABEL[status]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
        {isFiltered && (
          <Link href="/admin/users" className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldUser}
          title={isFiltered ? "Tidak ada pengguna yang cocok" : "Belum ada pengguna"}
          description={
            isFiltered
              ? "Ubah kata kunci atau filter."
              : "Tambahkan akun pelatih atau atlet pertama."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead className="pr-4">Login terakhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {user.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>{ROLE_LABEL[user.role]}</TableCell>
                  <TableCell>
                    <StatusBadge tone={userStatusTone(user.status)}>
                      {USER_STATUS_LABEL[user.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {user.twoFactorEnabled ? (
                      <StatusBadge tone="info">Aktif</StatusBadge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground">
                    {formatDateTime(user.lastLoginAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <span className="numeric">{total}</span> pengguna
      </p>
      <PaginationLinks
        basePath="/admin/users"
        params={{ q: filter.q, role: filter.role, status: filter.status }}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
