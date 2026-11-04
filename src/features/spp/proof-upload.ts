import type { ActionResult } from "@/lib/errors";
import { checkProofFile } from "@/lib/storage/payment-proof";
import { uploadToSignedUrl } from "@/lib/storage/upload-client";

type Ticket = { key: string; signedUrl: string };
export type ProofUploadResult = { ok: true; key: string } | { ok: false; message: string };

// File dibaca dari form saat submit, sehingga pilihan sebelum hidrasi selesai tidak hilang.
export function proofFileFrom(form: HTMLFormElement): File | undefined {
  const input = form.elements.namedItem("proof");
  return input instanceof HTMLInputElement ? input.files?.[0] : undefined;
}

// Cek file di browser, minta signed URL ke server, lalu unggah langsung ke Supabase.
// Isi file diperiksa ulang di server saat pembayaran disimpan.
export async function uploadProof(
  file: File,
  requestTicket: (meta: { size: number; type: string }) => Promise<ActionResult<Ticket>>,
  onProgress: (percent: number) => void,
): Promise<ProofUploadResult> {
  const check = checkProofFile(file);
  if (!check.ok) return check;

  try {
    const ticket = await requestTicket({ size: file.size, type: file.type });
    if (!ticket.success) return { ok: false, message: ticket.error.message };
    await uploadToSignedUrl(ticket.data.signedUrl, file, file.type, onProgress);
    return { ok: true, key: ticket.data.key };
  } catch {
    return { ok: false, message: "Upload gagal. Periksa koneksi lalu coba lagi." };
  }
}
