import { StatusBadge } from "@/components/shared/status-badge";
import { GENDER_LABEL } from "@/constants/labels";
import type { Gender } from "@/generated/prisma/enums";
import { ageOn, formatDate } from "@/lib/format";

export type AthleteSummaryData = {
  athleteNumber: string;
  gender: Gender;
  birthDate: Date;
  joinDate: Date;
  phone: string | null;
  isActive: boolean;
  trainingGroup: { name: string; coach: { fullName: string } | null } | null;
  user: { email: string };
};

// Data diri atlet (read-only) untuk profil atlet dan halaman atlet binaan pelatih.
export function AthleteSummary({ athlete }: { athlete: AthleteSummaryData }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
      <dt className="text-muted-foreground">Status</dt>
      <dd>
        <StatusBadge tone={athlete.isActive ? "success" : "neutral"}>
          {athlete.isActive ? "Aktif" : "Nonaktif"}
        </StatusBadge>
      </dd>
      <dt className="text-muted-foreground">No. atlet</dt>
      <dd className="numeric">{athlete.athleteNumber}</dd>
      <dt className="text-muted-foreground">Umur</dt>
      <dd>
        <span className="numeric">{ageOn(athlete.birthDate)}</span> tahun
        <span className="text-muted-foreground"> · {formatDate(athlete.birthDate)}</span>
      </dd>
      <dt className="text-muted-foreground">Jenis kelamin</dt>
      <dd>{GENDER_LABEL[athlete.gender]}</dd>
      <dt className="text-muted-foreground">Kelompok</dt>
      <dd>{athlete.trainingGroup?.name ?? "Belum punya kelompok"}</dd>
      <dt className="text-muted-foreground">Pelatih</dt>
      <dd>{athlete.trainingGroup?.coach?.fullName ?? "—"}</dd>
      <dt className="text-muted-foreground">Bergabung</dt>
      <dd>{formatDate(athlete.joinDate)}</dd>
      <dt className="text-muted-foreground">Email</dt>
      <dd className="break-all">{athlete.user.email}</dd>
      <dt className="text-muted-foreground">No. HP</dt>
      <dd>{athlete.phone ?? "—"}</dd>
    </dl>
  );
}
