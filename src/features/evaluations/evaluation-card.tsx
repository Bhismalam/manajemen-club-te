import { CalendarDays, ChevronRight, ClipboardList, Pencil } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { listEvaluations } from "@/services/evaluation-service";

type Evaluation = Awaited<ReturnType<typeof listEvaluations>>["items"][number];

const SECTIONS = [
  { key: "strengths", label: "Kekuatan" },
  { key: "weaknesses", label: "Kekurangan" },
  { key: "focus", label: "Fokus perbaikan" },
  { key: "target", label: "Target berikutnya" },
] as const;

// Isi lengkap satu evaluasi. `editHref` hanya diisi jika actor boleh mengubah.
export function EvaluationCard({
  evaluation,
  showAthlete = false,
  editHref,
}: {
  evaluation: Evaluation;
  showAthlete?: boolean;
  editHref?: string;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {showAthlete && <h3 className="font-semibold">{evaluation.athlete.fullName}</h3>}
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(evaluation.evaluationDate)} · oleh {evaluation.coach.fullName}
          </p>
        </div>
        {editHref && (
          <Link href={editHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Pencil />
            Ubah
          </Link>
        )}
      </header>
      <dl className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <div key={section.key} className="flex flex-col gap-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {section.label}
            </dt>
            <dd className="text-sm whitespace-pre-line">{evaluation[section.key]}</dd>
          </div>
        ))}
      </dl>
      {evaluation.notes && (
        <p className="border-t pt-3 text-sm whitespace-pre-line text-muted-foreground">
          {evaluation.notes}
        </p>
      )}
    </article>
  );
}

// Daftar ringkas (pelatih): satu baris per evaluasi, menuju halaman detail.
export function EvaluationRows({
  evaluations,
  basePath,
}: {
  evaluations: Evaluation[];
  basePath: string;
}) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {evaluations.map((evaluation) => (
        <li key={evaluation.id}>
          <Link
            href={`${basePath}/${evaluation.id}`}
            className="flex items-center gap-4 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">
                {evaluation.athlete.fullName}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {formatDate(evaluation.evaluationDate)}
                </span>
              </span>
              <span className="truncate text-sm text-muted-foreground">
                Fokus: {evaluation.focus}
              </span>
              <span className="text-xs text-muted-foreground">
                oleh {evaluation.coach.fullName}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NoEvaluations({ description }: { description: string }) {
  return <EmptyState icon={ClipboardList} title="Belum ada evaluasi" description={description} />;
}
