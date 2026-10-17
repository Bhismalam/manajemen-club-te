// Format tampilan. Timestamp disimpan UTC dan ditampilkan dalam zona waktu klub;
// kolom tanggal saja (@db.Date) dibaca sebagai tanggal UTC agar tidak bergeser hari.

export const CLUB_TIME_ZONE = "Asia/Jakarta";
const LOCALE = "id-ID";

const dateOnlyFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: CLUB_TIME_ZONE,
});

export function formatDate(value: Date | null | undefined): string {
  return value ? dateOnlyFormat.format(value) : "—";
}

export function formatDateTime(value: Date | null | undefined): string {
  return value ? dateTimeFormat.format(value) : "—";
}

// Umur dalam tahun penuh pada tanggal `today` (default: sekarang).
export function ageOn(birthDate: Date, today: Date = new Date()): number {
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

// "2011-04-12" untuk <input type="date"> dari kolom @db.Date.
export function toDateInputValue(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}
