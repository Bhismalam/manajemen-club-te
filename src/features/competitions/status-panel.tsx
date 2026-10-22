"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { CompetitionStatus } from "@/generated/prisma/enums";
import { allowedTransitions } from "@/lib/competitions";

import { setCompetitionStatusAction } from "./competition-actions";

type Action = {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  title: string;
  description: string;
  confirmLabel: string;
};

const ACTIONS: Record<CompetitionStatus, Action> = {
  UPCOMING: {
    label: "Publikasikan",
    variant: "default",
    title: "Publikasikan event ini?",
    description:
      "Event akan terlihat oleh semua atlet dan pelatih, dan pendaftaran mengikuti periode yang diatur.",
    confirmLabel: "Publikasikan",
  },
  ONGOING: {
    label: "Tandai berlangsung",
    variant: "secondary",
    title: "Tandai event sedang berlangsung?",
    description: "Pendaftaran mandiri atlet & pelatih otomatis tertutup.",
    confirmLabel: "Tandai berlangsung",
  },
  COMPLETED: {
    label: "Tandai selesai",
    variant: "secondary",
    title: "Tandai event selesai?",
    description: "Event yang selesai tidak bisa diubah lagi.",
    confirmLabel: "Tandai selesai",
  },
  DRAFT: {
    label: "Kembali ke draft",
    variant: "outline",
    title: "Kembalikan event ke draft?",
    description: "Event disembunyikan lagi dari atlet dan pelatih lain.",
    confirmLabel: "Kembali ke draft",
  },
  CANCELLED: {
    label: "Batalkan event",
    variant: "destructive",
    title: "Batalkan event ini?",
    description: "Event tetap terlihat dengan status Dibatalkan dan tidak bisa diubah lagi.",
    confirmLabel: "Batalkan event",
  },
};

// Tombol perpindahan status yang diizinkan; syarat publish yang belum terpenuhi ditampilkan.
export function StatusPanel({
  competitionId,
  status,
  publishBlockers,
  registrationCount,
}: {
  competitionId: string;
  status: CompetitionStatus;
  publishBlockers: string[];
  registrationCount: number;
}) {
  const [target, setTarget] = useState<CompetitionStatus | null>(null);
  const transitions = allowedTransitions(status);

  if (transitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Event ini sudah final dan tidak bisa diubah.</p>
    );
  }

  const disabledReason = (to: CompetitionStatus) => {
    if (to === "UPCOMING" && publishBlockers.length > 0) return "Lengkapi syarat di atas dulu.";
    if (to === "DRAFT" && registrationCount > 0) return "Sudah ada pendaftar.";
    return null;
  };

  const action = target ? ACTIONS[target] : null;

  return (
    <div className="flex flex-col gap-4">
      {transitions.includes("UPCOMING") && publishBlockers.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-warning/10 p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-warning">
            <CircleAlert className="size-4" aria-hidden="true" />
            Belum bisa dipublikasikan
          </p>
          <ul className="list-disc pl-6 text-foreground">
            {publishBlockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {transitions.map((to) => {
          const reason = disabledReason(to);
          return (
            <Button
              key={to}
              variant={ACTIONS[to].variant}
              disabled={Boolean(reason)}
              title={reason ?? undefined}
              onClick={() => setTarget(to)}
            >
              {ACTIONS[to].label}
            </Button>
          );
        })}
      </div>
      {transitions.includes("DRAFT") && registrationCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Event yang sudah punya pendaftar tidak bisa dikembalikan ke draft.
        </p>
      )}

      {action && target && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setTarget(null)}
          title={action.title}
          description={action.description}
          confirmLabel={action.confirmLabel}
          pendingLabel="Menyimpan…"
          destructive={target === "CANCELLED"}
          onConfirm={async () => {
            const result = await setCompetitionStatusAction({ competitionId, status: target });
            if (!result.success) {
              toast.error(result.error.message);
              return false;
            }
            toast.success(result.message ?? "Status diubah.");
            setTarget(null);
            return true;
          }}
        />
      )}
    </div>
  );
}
