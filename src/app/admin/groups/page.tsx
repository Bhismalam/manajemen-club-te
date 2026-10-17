import { Plus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireActor } from "@/lib/permissions/actor";
import { listTrainingGroups } from "@/services/training-group-service";

export const metadata: Metadata = { title: "Kelompok Latihan" };

export default function GroupsPage() {
  return (
    <>
      <PageHeader
        title="Kelompok latihan"
        description="Pelatih kelompok otomatis menjadi pembina semua atlet di dalamnya."
        actions={
          <Link href="/admin/groups/new" className={buttonVariants()}>
            <Plus />
            Tambah kelompok
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <GroupList />
      </Suspense>
    </>
  );
}

async function GroupList() {
  await requireActor("ADMIN");
  const groups = await listTrainingGroups();

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Belum ada kelompok latihan"
        description="Buat kelompok, tentukan pelatihnya, lalu masukkan atlet ke kelompok tersebut."
      />
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Kelompok</TableHead>
            <TableHead>Pelatih</TableHead>
            <TableHead>Atlet</TableHead>
            <TableHead className="pr-4">Sesi latihan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="pl-4">
                <Link
                  href={`/admin/groups/${group.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {group.name}
                </Link>
                {group.description && (
                  <div className="max-w-sm truncate text-xs text-muted-foreground">
                    {group.description}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {group.coach ? (
                  <>
                    {group.coach.fullName}
                    {!group.coach.isActive && (
                      <span className="text-xs text-muted-foreground"> (nonaktif)</span>
                    )}
                  </>
                ) : (
                  <span className="text-warning">Belum ada pelatih</span>
                )}
              </TableCell>
              <TableCell className="numeric">{group._count.athletes}</TableCell>
              <TableCell className="numeric pr-4">{group._count.sessions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
