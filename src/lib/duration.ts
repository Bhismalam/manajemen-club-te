// Waktu renang disimpan sebagai milidetik integer (doc/ARCHITECTURE.md §11),
// diinput & ditampilkan dengan presisi seperseratus detik: "58.27", "1:05.32".

export const MAX_DURATION_MS = 60 * 60 * 1000; // 1 jam

// Terima "58.27", "58.2", "58", "1:05.32", "1:5.3", "0:31.40". Kembalikan null jika tidak valid.
export function parseDuration(input: string): number | null {
  const value = input.trim().replace(",", ".");
  const match = /^(?:(\d{1,2}):)?(\d{1,2})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const [, minutesRaw, secondsRaw, fractionRaw] = match;
  const minutes = minutesRaw ? Number(minutesRaw) : 0;
  const seconds = Number(secondsRaw);
  // Detik selalu < 60: "99" ditolak agar salah ketik tidak diam-diam menjadi 1:39.00.
  if (seconds >= 60) return null;
  const hundredths = fractionRaw ? Number(fractionRaw.padEnd(2, "0")) : 0;
  const ms = (minutes * 60 + seconds) * 1000 + hundredths * 10;
  if (ms <= 0 || ms >= MAX_DURATION_MS) return null;
  return ms;
}

// 58270 → "58.27", 65320 → "1:05.32". Milidetik di bawah seperseratus dibulatkan ke bawah.
export function formatDuration(ms: number): string {
  const hundredths = Math.floor(ms / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  const fraction = String(hundredths % 100).padStart(2, "0");
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}.${fraction}`
    : `${seconds}.${fraction}`;
}

// Selisih waktu: "-0.45" (lebih cepat) / "+1.20" (lebih lambat).
export function formatDelta(ms: number): string {
  return `${ms < 0 ? "−" : "+"}${formatDuration(Math.abs(ms))}`;
}
