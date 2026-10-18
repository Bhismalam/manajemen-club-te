"use client";

import { Download, FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { checkPdfFile, PDF_MIME_TYPE } from "@/lib/storage/pdf";

import {
  confirmAttachmentUploadAction,
  removeAttachmentAction,
  requestAttachmentUploadAction,
} from "./competition-actions";

// Unggah langsung ke signed URL Supabase (tidak melewati server aplikasi), dengan progres.
function uploadToSignedUrl(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", PDF_MIME_TYPE);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

export function AttachmentCard({
  competitionId,
  fileName,
  downloadHref,
  canManage,
}: {
  competitionId: string;
  fileName: string | null;
  downloadHref: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const busy = progress !== null;

  async function handleFile(file: File) {
    const check = checkPdfFile(file);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }

    setProgress(0);
    try {
      const request = await requestAttachmentUploadAction({
        competitionId,
        fileName: file.name,
        size: file.size,
        type: file.type,
      });
      if (!request.success) {
        toast.error(request.error.message);
        return;
      }
      try {
        await uploadToSignedUrl(request.data.signedUrl, file, setProgress);
      } catch {
        toast.error("Upload gagal. Periksa koneksi lalu coba lagi.");
        return;
      }
      const confirm = await confirmAttachmentUploadAction({
        competitionId,
        key: request.data.key,
        fileName: file.name,
      });
      if (!confirm.success) {
        toast.error(confirm.error.message);
        return;
      }
      toast.success(confirm.message ?? "PDF disimpan.");
      router.refresh();
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {fileName ? (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={fileName}>
            {fileName}
          </span>
          <a
            href={downloadHref}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label={`Unduh ${fileName}`}
          >
            <Download />
            Unduh
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Belum ada PDF. Lampirkan technical handbook atau surat undangan event (maks. 10 MB).
        </p>
      )}

      {canManage && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={`${PDF_MIME_TYPE},.pdf`}
            className="sr-only"
            id={`attachment-${competitionId}`}
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {busy && (
            <div className="flex flex-col gap-1" role="status" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress === 100 ? "Memeriksa file…" : `Mengunggah… ${progress}%`}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              {fileName ? "Ganti PDF" : "Unggah PDF"}
            </Button>
            {fileName && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmRemove(true)}
              >
                Hapus PDF
              </Button>
            )}
          </div>
          <ConfirmDialog
            open={confirmRemove}
            onOpenChange={setConfirmRemove}
            title="Hapus PDF event?"
            description="File dihapus dari penyimpanan dan tidak bisa diunduh lagi."
            confirmLabel="Hapus"
            pendingLabel="Menghapus…"
            destructive
            onConfirm={async () => {
              const result = await removeAttachmentAction({ competitionId });
              if (!result.success) {
                toast.error(result.error.message);
                return false;
              }
              toast.success(result.message ?? "Dihapus.");
              router.refresh();
              return true;
            }}
          />
        </>
      )}
    </div>
  );
}
