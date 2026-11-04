"use client";

import { useEffect } from "react";

import { markSppNotificationsReadAction } from "./spp-actions";

// Saat admin benar-benar membuka halaman SPP, notifikasi bukti baru ditandai dibaca.
// Dilakukan dari client (bukan saat render) agar prefetch halaman tidak ikut menandai.
export function MarkSppReadOnView() {
  useEffect(() => {
    void markSppNotificationsReadAction();
  }, []);
  return null;
}
