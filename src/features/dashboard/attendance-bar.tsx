import type { AttendanceCounts } from "@/lib/attendance";

// Satu baris persentase kehadiran dengan bar. Angka tetap tertulis (tidak hanya warna).
export function AttendanceBar({ label, counts }: { label: string; counts: AttendanceCounts }) {
  const rate = counts.rate ?? 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          <span className="numeric font-semibold text-foreground">
            {counts.rate === null ? "—" : `${counts.rate}%`}
          </span>{" "}
          · {counts.PRESENT}/{counts.total} hadir
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label}: ${counts.rate ?? 0}% hadir`}
      >
        <div
          className={
            rate >= 80
              ? "h-full bg-success"
              : rate >= 60
                ? "h-full bg-warning"
                : "h-full bg-destructive"
          }
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}
