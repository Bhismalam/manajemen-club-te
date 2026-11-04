// Aturan file bukti pembayaran SPP (fungsi murni, aman dipakai di client & server).

export const PROOF_BUCKET = "payment-proofs";
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;

export type ProofExtension = "jpg" | "png" | "webp" | "pdf";

const EXTENSION_BY_MIME: Record<string, ProofExtension> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const PROOF_MIME_TYPES = Object.keys(EXTENSION_BY_MIME);
export const PROOF_ACCEPT = PROOF_MIME_TYPES.join(",");

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, i) => bytes[offset + i] === byte);

// Jenis file dari isi, bukan dari nama. 12 byte pertama sudah cukup untuk semua format.
export function detectProofType(bytes: Uint8Array): ProofExtension | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "webp";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  return null;
}

export type ProofCheck = { ok: true; extension: ProofExtension } | { ok: false; message: string };

export function checkProofFile(file: { size: number; type: string }): ProofCheck {
  const extension = EXTENSION_BY_MIME[file.type];
  if (!extension)
    return { ok: false, message: "Bukti harus berupa foto (JPG, PNG, WebP) atau PDF." };
  if (file.size <= 0) return { ok: false, message: "File kosong." };
  if (file.size > PROOF_MAX_BYTES) return { ok: false, message: "Ukuran bukti maksimal 10 MB." };
  return { ok: true, extension };
}

// Key dibuat server dan terikat pada atlet + bulan; nama asli tidak dipakai sebagai path.
export function proofKeyFor(
  athleteId: string,
  month: string,
  extension: ProofExtension,
  uuid: string = crypto.randomUUID(),
) {
  return `spp/${athleteId}/${month}/${uuid}.${extension}`;
}

export function isProofKeyOf(key: string, athleteId: string, month: string): boolean {
  const prefix = `spp/${athleteId}/${month}/`;
  if (!key.startsWith(prefix)) return false;
  return /^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(key.slice(prefix.length));
}
