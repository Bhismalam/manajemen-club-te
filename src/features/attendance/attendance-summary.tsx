import { CalendarCheck } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
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
import { ATTENDANCE_LABEL } from "@/constants/labels";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { formatDate, formatTime, formatWeekdayDate } from "@/lib/format";
import type { Actor } from "@/lib/permissions/types";
import type { AttendanceSummaryFilter } from "@/lib/validations/attendance";
import { dateOnly } from "@/lib/validations/common";
import { getAttendanceSummary } from "@/services/attendance-service";
import type { GroupOption } from "@/services/training-group-service";

import { AttendanceCountBadges } from "./attendance-section";

// Rekap kehadiran per atlet + sesi yang belum diabsen (admin & pelatih).
export async function AttendanceSummary({
  actor,
  filter,
  groups,
  basePath,
  trainingBasePath,
}: {
  actor: Actor;
  filter: AttendanceSummaryFilter;
  groups: GroupOption[];
  basePath: string;
  trainingBasePath: string;
}) {
  const { from, to, rows, overall, pendingSessions } = await getAttendanceSummary(actor, filter);
  const isFiltered = Boolean(filter.group || filter.from || filter.to);

  return (
    <div className="flex flex-col gap-6">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Kelompok</span>
          <NativeSelect name="group" defaultValue={filter.group}>
            <NativeSelectOption value="">Semua kelompok</NativeSelectOption>
            {groups.map((group) => (
              <NativeSelectOption key={group.id} value={group.id}>
                {group.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Dari tanggal</span>
          <Input type="date" name="from" defaultValue={from} className="sm:w-44" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Sampai tanggal</span>
          <Input type="date" name="to" defaultValue={to} className="sm:w-44" />
        </label>
        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
        {isFiltered && (
          <Link href={basePath} className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        )}
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          {formatDate(dateOnly(from))} – {formatDate(dateOnly(to))}
        </h2>
        {overall.total > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              Kehadiran <span className="numeric text-base font-semibold">{overall.rate}%</span>{" "}
              <span className="text-muted-foreground">dari {overall.total} catatan</span>
            </p>
            <AttendanceCountBadges counts={overall} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada catatan absensi di rentang ini.</p>
        )}
      </section>

      {pendingSessions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Belum diabsen</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {pendingSessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`${trainingBasePath}/${session.id}`}
                  className="flex flex-col gap-0.5 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="font-medium">{session.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      · {session.trainingGroup.name}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatWeekdayDate(session.startsAt)}, {formatTime(session.startsAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Per atlet</h2>
        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Belum ada atlet"
            description="Atlet aktif di kelompok yang dipilih akan tampil di sini."
          />
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Atlet</TableHead>
                  <TableHead>Kelompok</TableHead>
                  {ATTENDANCE_STATUSES.map((status) => (
                    <TableHead key={status} className="text-right">
                      {ATTENDANCE_LABEL[status]}
                    </TableHead>
                  ))}
                  <TableHead className="pr-4 text-right">Kehadiran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <span className="font-medium">{row.fullName}</span>
                      <div className="numeric text-xs text-muted-foreground">
                        {row.athleteNumber}
                      </div>
                    </TableCell>
                    <TableCell>{row.trainingGroup?.name ?? "—"}</TableCell>
                    {ATTENDANCE_STATUSES.map((status) => (
                      <TableCell key={status} className="numeric text-right">
                        {row.counts[status]}
                      </TableCell>
                    ))}
                    <TableCell className="numeric pr-4 text-right font-medium">
                      {row.counts.rate === null ? "—" : `${row.counts.rate}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Persentase kehadiran = Hadir ÷ sesi yang tercatat untuk atlet tersebut.
        </p>
      </section>
    </div>
  );
}
