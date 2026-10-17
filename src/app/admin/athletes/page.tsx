import { UserPlus, Users } from "lucide-react";
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
import { GENDER_LABEL } from "@/constants/labels";
import { ageOn } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { athleteListFilterSchema } from "@/lib/validations/profiles";
import { listAthletes } from "@/services/athlete-service";
import { listTrainingGroupOptions } from "@/services/training-group-service";

export const metadata: Metadata = { title: "Atlet" };

export default function AthletesPage({ searchParams }: PageProps<"/admin/athletes">) {
  return (
    <>
      <PageHeader
        title="Atlet"
        description="Profil semua atlet klub."
        actions={
          <Link href="/admin/users/new" className={buttonVariants()}>
            <UserPlus />
            Tambah atlet
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <AthleteList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AthleteList({
  searchParams,
}: {
  searchParams: PageProps<"/admin/athletes">["searchParams"];
}) {
  const actor = await requireActor("ADMIN");
  const filter = athleteListFilterSchema.parse(await searchParams);
  const [{ items, total, page, pageSize }, groups] = await Promise.all([
    listAthletes(actor, filter),
    listTrainingGroupOptions(),
  ]);
  const isFiltered = Boolean(filter.q || filter.group || filter.status);

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="q">
          Cari nama atau nomor atlet
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={filter.q}
          placeholder="Cari nama atau nomor atlet"
          className="sm:max-w-xs"
        />
        <label className="sr-only" htmlFor="group">
          Kelompok
        </label>
        <NativeSelect id="group" name="group" defaultValue={filter.group}>
          <NativeSelectOption value="">Semua kelompok</NativeSelectOption>
          {groups.map((group) => (
            <NativeSelectOption key={group.id} value={group.id}>
              {group.name}
            </NativeSelectOption>
          ))}
          <NativeSelectOption value="none">Tanpa kelompok</NativeSelectOption>
        </NativeSelect>
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <NativeSelect id="status" name="status" defaultValue={filter.status ?? ""}>
          <NativeSelectOption value="">Semua status</NativeSelectOption>
          <NativeSelectOption value="active">Aktif</NativeSelectOption>
          <NativeSelectOption value="inactive">Nonaktif</NativeSelectOption>
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
        {isFiltered && (
          <Link href="/admin/athletes" className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={isFiltered ? "Tidak ada atlet yang cocok" : "Belum ada atlet"}
          description={
            isFiltered
              ? "Ubah kata kunci atau filter."
              : "Atlet ditambahkan lewat Tambah pengguna dengan role Atlet."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>No. atlet</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Jenis kelamin</TableHead>
                <TableHead>Umur</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((athlete) => (
                <TableRow key={athlete.id}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/admin/athletes/${athlete.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {athlete.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="numeric">{athlete.athleteNumber}</TableCell>
                  <TableCell>
                    {athlete.trainingGroup?.name ?? (
                      <span className="text-muted-foreground">Belum ada</span>
                    )}
                  </TableCell>
                  <TableCell>{GENDER_LABEL[athlete.gender]}</TableCell>
                  <TableCell className="numeric">{ageOn(athlete.birthDate)}</TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge tone={athlete.isActive ? "success" : "neutral"}>
                      {athlete.isActive ? "Aktif" : "Nonaktif"}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <span className="numeric">{total}</span> atlet
      </p>
      <PaginationLinks
        basePath="/admin/athletes"
        params={{ q: filter.q, group: filter.group, status: filter.status }}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
