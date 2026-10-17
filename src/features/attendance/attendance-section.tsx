import { Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import type { StatusTone } from "@/components/shared/status-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ATTENDANCE_LABEL } from "@/constants/labels";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import type { AttendanceCounts } from "@/lib/attendance";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import type { Actor } from "@/lib/permissions/types";
import { getSessionAttendance } from "@/services/attendance-service";

import { AttendanceForm } from "./attendance-form";

export const ATTENDANCE_TONE: Record<AttendanceStatus, StatusTone> = {
  PRESENT: "success",
  PERMISSION: "info",
  SICK: "warning",
  ABSENT: "danger",
};

export function AttendanceCountBadges({ counts }: { counts: AttendanceCounts }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ATTENDANCE_STATUSES.map((status) => (
        <StatusBadge key={status} tone={counts[status] > 0 ? ATTENDANCE_TONE[status] : "neutral"}>
          {ATTENDANCE_LABEL[status]} <span className="numeric">{counts[status]}</span>
        </StatusBadge>
      ))}
    </div>
  );
}

export async function AttendanceSection({ actor, sessionId }: { actor: Actor; sessionId: string }) {
  const { rows, canManage, canRecord, summary } = await getSessionAttendance(actor, sessionId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absensi</CardTitle>
        <CardDescription>
          {canRecord
            ? "Tandai kehadiran setiap atlet, lalu simpan. Bisa diubah kapan saja."
            : canManage
              ? "Absensi bisa dicatat mulai hari sesi latihan."
              : "Rekap kehadiran sesi ini."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary.total > 0 && <AttendanceCountBadges counts={summary} />}

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada atlet di kelompok ini"
            description="Masukkan atlet ke kelompok lewat profil atlet."
          />
        ) : canRecord ? (
          <AttendanceForm sessionId={sessionId} rows={rows} />
        ) : summary.total > 0 ? (
          <ul className="divide-y rounded-lg border text-sm">
            {rows.map((row) => (
              <li key={row.athleteId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  {row.fullName}
                  {row.note && <span className="text-muted-foreground"> · {row.note}</span>}
                </span>
                {row.status ? (
                  <StatusBadge tone={ATTENDANCE_TONE[row.status]}>
                    {ATTENDANCE_LABEL[row.status]}
                  </StatusBadge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {rows.length} atlet di kelompok ini. Belum ada catatan kehadiran.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
