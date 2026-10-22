"use client";

import { useEffect } from "react";

import { markRosterNotificationsReadAction } from "./registration-actions";

// Saat admin benar-benar membuka rekap, notifikasi pendaftaran event ini ditandai dibaca.
// Dilakukan dari client (bukan saat render) agar prefetch halaman tidak ikut menandai.
export function MarkReadOnView({ competitionId }: { competitionId: string }) {
  useEffect(() => {
    void markRosterNotificationsReadAction(competitionId);
  }, [competitionId]);
  return null;
}
