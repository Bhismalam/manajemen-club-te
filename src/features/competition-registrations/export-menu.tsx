"use client";

import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ExportFormat } from "@/lib/validations/registrations";

const FORMATS: { format: ExportFormat; label: string; icon: typeof FileText }[] = [
  { format: "xlsx", label: "Download Excel", icon: FileSpreadsheet },
  { format: "pdf", label: "Download PDF", icon: FileText },
];

function fileNameFrom(disposition: string | null, fallback: string) {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? fallback;
}

// Unduh rekap pendaftar dengan indikator loading selama file dibuat di server.
export function ExportMenu({
  competitionId,
  disabled,
}: {
  competitionId: string;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function download(format: ExportFormat) {
    setBusy(format);
    try {
      const response = await fetch(
        `/api/admin/competitions/${competitionId}/registrations/export?format=${format}`,
      );
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body.error as { message?: string }).message)
            : "File gagal dibuat. Coba lagi.";
        toast.error(message);
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFrom(
        response.headers.get("Content-Disposition"),
        `pendaftar.${format}`,
      );
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("File gagal diunduh. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FORMATS.map(({ format, label, icon: Icon }) => (
        <Button
          key={format}
          variant="outline"
          disabled={disabled || busy !== null}
          onClick={() => void download(format)}
        >
          {busy === format ? <Loader2 className="animate-spin" /> : <Icon />}
          {busy === format ? "Menyiapkan…" : label}
        </Button>
      ))}
    </div>
  );
}
