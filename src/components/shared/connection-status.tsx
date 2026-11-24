"use client";

import { WifiOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function ConnectionStatus() {
  const online = useOnlineStatus();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={online ? "sr-only" : undefined}
    >
      {!online && (
        <Alert role="presentation" className="border-warning/40 text-warning">
          <WifiOff aria-hidden="true" />
          <AlertTitle>Koneksi terputus</AlertTitle>
          <AlertDescription>
            TE membutuhkan internet. Penyimpanan bisa terganggu. Jangan tutup halaman jika ada isian
            yang belum tersimpan.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
