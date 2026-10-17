import { UserCog, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
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
import { requireActor } from "@/lib/permissions/actor";
import { coachListFilterSchema } from "@/lib/validations/profiles";
import { listCoaches } from "@/services/coach-service";

export const metadata: Metadata = { title: "Pelatih" };

export default function CoachesPage({ searchParams }: PageProps<"/admin/coaches">) {
  return (
    <>
      <PageHeader
        title="Pelatih"
        description="Pelatih klub dan kelompok latihan yang mereka bina."
        actions={
          <Link href="/admin/users/new?role=COACH" className={buttonVariants()}>
            <UserPlus />
            Tambah pelatih
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <CoachList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CoachList({
  searchParams,
}: {
  searchParams: PageProps<"/admin/coaches">["searchParams"];
}) {
  await requireActor("ADMIN");
  const filter = coachListFilterSchema.parse(await searchParams);
  const coaches = await listCoaches(filter);
  const isFiltered = Boolean(filter.q || filter.status);

  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="q">
          Cari nama pelatih
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={filter.q}
          placeholder="Cari nama pelatih"
          className="sm:max-w-xs"
        />
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
          <Link href="/admin/coaches" className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        )}
      </form>

      {coaches.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title={isFiltered ? "Tidak ada pelatih yang cocok" : "Belum ada pelatih"}
          description={
            isFiltered
              ? "Ubah kata kunci atau filter."
              : "Pelatih ditambahkan lewat Tambah pengguna dengan role Pelatih."
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>Spesialisasi</TableHead>
                <TableHead>Kelompok dibina</TableHead>
                <TableHead>Atlet</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map((coach) => (
                <TableRow key={coach.id}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/admin/coaches/${coach.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {coach.fullName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{coach.user.email}</div>
                  </TableCell>
                  <TableCell>{coach.specialization ?? "—"}</TableCell>
                  <TableCell>
                    {coach.trainingGroups.length > 0 ? (
                      coach.trainingGroups.map((group) => group.name).join(", ")
                    ) : (
                      <span className="text-muted-foreground">Belum ada</span>
                    )}
                  </TableCell>
                  <TableCell className="numeric">
                    {coach.trainingGroups.reduce((sum, group) => sum + group._count.athletes, 0)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge tone={coach.isActive ? "success" : "neutral"}>
                      {coach.isActive ? "Aktif" : "Nonaktif"}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
