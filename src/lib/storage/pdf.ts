// Aturan file PDF event (fungsi murni, aman dipakai di client & server).

export const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const PDF_MIME_TYPE = "application/pdf";
export const PRIVATE_BUCKET = "private-docs";
export const PUBLIC_BUCKET = "public-media";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

// Isi file benar-benar PDF (bukan hanya nama berakhiran .pdf).
export function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= PDF_MAGIC.length && PDF_MAGIC.every((byte, i) => bytes[i] === byte);
}

// Key objek dibuat server; nama asli dari user tidak pernah dipakai sebagai path.
export function attachmentKeyFor(competitionId: string, uuid: string = crypto.randomUUID()) {
  return `competitions/${competitionId}/${uuid}.pdf`;
}

// Key hasil upload harus milik event ini dan berbentuk persis seperti `attachmentKeyFor`.
export function isAttachmentKeyOf(key: string, competitionId: string): boolean {
  const prefix = `competitions/${competitionId}/`;
  if (!key.startsWith(prefix)) return false;
  return /^[0-9a-f-]{36}\.pdf$/.test(key.slice(prefix.length));
}

// Nama file untuk ditampilkan & dipakai saat unduh: tanpa path dan karakter kontrol.
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .trim()
    .slice(0, 150);
  return cleaned || "dokumen.pdf";
}

export type PdfCheck = { ok: true } | { ok: false; message: string };

export function checkPdfFile(file: { name: string; size: number; type: string }): PdfCheck {
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== PDF_MIME_TYPE)) {
    return { ok: false, message: "File harus berformat PDF." };
  }
  if (file.size <= 0) return { ok: false, message: "File kosong." };
  if (file.size > PDF_MAX_BYTES) return { ok: false, message: "Ukuran PDF maksimal 10 MB." };
  return { ok: true };
}
