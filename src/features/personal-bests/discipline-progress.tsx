import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDelta, formatDuration } from "@/lib/duration";
import { isAppError } from "@/lib/errors";
import { formatClubDate } from "@/lib/format";
import { getDisciplineProgress } from "@/services/personal-best-service";

import { ProgressChart } from "./progress-chart";

// Progres satu atlet di satu nomor lomba: PB, grafik, dan semua hasil (terbaru dulu).
export async function DisciplineProgress({
  athleteId,
  athleteName,
  disciplineId,
}: {
  athleteId: string;
  athleteName: string | null;
  disciplineId: string;
}) {
  let data;
  try {
    data = await getDisciplineProgress(athleteId, disciplineId);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { discipline, pb, results } = data;
  if (results.length === 0) notFound();

  const first = results[0]!;
  const improvement = pb ? pb.durationMs - first.durationMs : 0;
  const newestFirst = [...results].reverse();

  return (
    <>
      <PageHeader
        title={discipline.name}
        description={`${athleteName ? `${athleteName} · ` : ""}Kolam ${discipline.poolLength}m · ${results.length} hasil`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Personal best</p>
          <p className="numeric mt-2 text-4xl font-semibold">
            {pb ? formatDuration(pb.durationMs) : "—"}
          </p>
          {pb && (
            <p className="mt-1 text-xs text-muted-foreground">{formatClubDate(pb.achievedAt)}</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Hasil pertama</p>
          <p className="numeric mt-2 text-2xl font-semibold">{formatDuration(first.durationMs)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatClubDate(first.date)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Peningkatan sejak hasil pertama</p>
          <p className="numeric mt-2 text-2xl font-semibold">
            {results.length > 1 && improvement < 0 ? formatDelta(improvement) : "—"}
          </p>
        </div>
      </div>

      {results.length > 1 && (
        <Card>
          <CardContent>
            <ProgressChart
              title={`Perkembangan waktu ${discipline.name}`}
              points={results.map((result) => ({
                id: result.id,
                dateLabel: formatClubDate(result.date),
                time: result.date.getTime(),
                durationMs: result.durationMs,
                label: result.label ?? (result.source === "COMPETITION" ? "Lomba" : "Time trial"),
                isPbAtTime: result.isPbAtTime,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Semua hasil</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Tanggal</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead className="text-right">Waktu</TableHead>
                <TableHead className="pr-4">Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newestFirst.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="pl-4 whitespace-nowrap">
                    {formatClubDate(result.date)}
                  </TableCell>
                  <TableCell>
                    {result.source === "COMPETITION" ? "Lomba" : "Time trial"}
                    {result.label && (
                      <span className="text-xs text-muted-foreground"> · {result.label}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-2">
                      {pb?.sourceId === result.id ? (
                        <StatusBadge tone="success">PB</StatusBadge>
                      ) : result.isPbAtTime ? (
                        <StatusBadge tone="neutral">PB saat itu</StatusBadge>
                      ) : null}
                      <span className="numeric font-semibold">
                        {formatDuration(result.durationMs)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate pr-4 text-muted-foreground">
                    {result.note ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
