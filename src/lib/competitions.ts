import type { CompetitionStatus } from "@/generated/prisma/enums";

// Aturan status event (fungsi murni). Lihat doc/PRD.md §4.9.1.

const TRANSITIONS: Record<CompetitionStatus, CompetitionStatus[]> = {
  DRAFT: ["UPCOMING", "CANCELLED"],
  UPCOMING: ["ONGOING", "CANCELLED", "DRAFT"],
  ONGOING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["DRAFT"],
};

export function allowedTransitions(status: CompetitionStatus): CompetitionStatus[] {
  return TRANSITIONS[status];
}

// Event selesai / batal hanya dibaca; status lain masih boleh diubah isinya.
export function isEditableStatus(status: CompetitionStatus): boolean {
  return status === "DRAFT" || status === "UPCOMING" || status === "ONGOING";
}

export type PublishFacts = {
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  disciplineCount: number;
};

// Syarat yang belum terpenuhi sebelum event bisa dipublikasikan (kosong = siap).
export function publishBlockers(facts: PublishFacts): string[] {
  const blockers: string[] = [];
  if (!facts.registrationOpensAt || !facts.registrationClosesAt) {
    blockers.push("Isi periode pendaftaran (buka & tutup).");
  }
  if (facts.disciplineCount === 0) blockers.push("Pilih minimal satu nomor lomba.");
  return blockers;
}

export type TransitionFacts = PublishFacts & { registrationCount: number };

// Alasan perpindahan status ditolak, atau null jika boleh.
export function transitionBlocker(
  from: CompetitionStatus,
  to: CompetitionStatus,
  facts: TransitionFacts,
): string | null {
  if (!TRANSITIONS[from].includes(to)) return "Perubahan status ini tidak diizinkan.";
  if (to === "UPCOMING") {
    const blockers = publishBlockers(facts);
    if (blockers.length > 0) return blockers.join(" ");
  }
  if (to === "DRAFT" && facts.registrationCount > 0) {
    return "Event yang sudah punya pendaftar tidak bisa dikembalikan ke draft.";
  }
  return null;
}
