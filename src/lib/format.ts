// Format tampilan. Timestamp disimpan UTC dan ditampilkan dalam zona waktu klub;
// kolom tanggal saja (@db.Date) dibaca sebagai tanggal UTC agar tidak bergeser hari.

// Zona waktu klub: WITA. Ubah CLUB_TIME_ZONE, CLUB_UTC_OFFSET, dan CLUB_TIME_ZONE_LABEL bersamaan.
export const CLUB_TIME_ZONE = "Asia/Makassar";
export const CLUB_TIME_ZONE_LABEL = "WITA";
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

// ---------------------------------------------------------------------------
// Jam klub (WITA). Indonesia tidak memakai DST, jadi offset tetap +08:00.
// ---------------------------------------------------------------------------

export const CLUB_UTC_OFFSET = "+08:00";

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: CLUB_TIME_ZONE,
});

const weekdayDateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: CLUB_TIME_ZONE,
});

const clubDatePartsFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: CLUB_TIME_ZONE,
});

// "2026-10-20" + "16:30" (jam klub) → instant UTC.
export function clubDateTimeToUtc(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${CLUB_UTC_OFFSET}`);
}

// Tanggal kalender klub ("YYYY-MM-DD") dari sebuah instant.
export function toClubDateInput(value: Date): string {
  return clubDatePartsFormat.format(value);
}

// Jam klub ("HH:mm") dari sebuah instant.
export function toClubTimeInput(value: Date): string {
  return timeFormat.format(value).replace(".", ":");
}

export function formatTime(value: Date): string {
  return toClubTimeInput(value);
}

// "Selasa, 20 Oktober 2026"
export function formatWeekdayDate(value: Date): string {
  return weekdayDateFormat.format(value);
}

// Rentang satu hari kalender klub dalam UTC: [awal hari, awal hari berikutnya).
export function clubDayRange(date: string): { start: Date; end: Date } {
  const start = clubDateTimeToUtc(date, "00:00");
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
