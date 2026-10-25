import type {
  AttendanceStatus,
  CompetitionLevel,
  CompetitionStatus,
  Gender,
  Medal,
  ResultStatus,
  Round,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";

// Label tampilan untuk enum database (Bahasa Indonesia).

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Admin",
  COACH: "Pelatih",
  ATHLETE: "Atlet",
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  SUSPENDED: "Ditangguhkan",
};

export const GENDER_LABEL: Record<Gender, string> = {
  MALE: "Laki-laki",
  FEMALE: "Perempuan",
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Hadir",
  PERMISSION: "Izin",
  SICK: "Sakit",
  ABSENT: "Tidak hadir",
};

export const COMPETITION_LEVEL_LABEL: Record<CompetitionLevel, string> = {
  CLUB: "Klub",
  REGIONAL: "Kab/Kota",
  PROVINCIAL: "Provinsi",
  NATIONAL: "Nasional",
  INTERNATIONAL: "Internasional",
};

export const COMPETITION_STATUS_LABEL: Record<CompetitionStatus, string> = {
  DRAFT: "Draft",
  UPCOMING: "Akan datang",
  ONGOING: "Berlangsung",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const RESULT_STATUS_LABEL: Record<ResultStatus, string> = {
  FINISHED: "Finish",
  DNS: "DNS (tidak start)",
  DNF: "DNF (tidak finish)",
  DSQ: "DSQ (diskualifikasi)",
};

export const ROUND_LABEL: Record<Round, string> = {
  TIME_FINAL: "Final langsung",
  HEAT: "Heat",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
};

export const MEDAL_LABEL: Record<Medal, string> = {
  NONE: "Tanpa medali",
  GOLD: "Emas",
  SILVER: "Perak",
  BRONZE: "Perunggu",
};

// Label aktivitas terbaru di dashboard admin; aksi lain ditampilkan apa adanya.
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "user.created": "membuat akun",
  "user.updated": "mengubah data akun",
  "user.role_changed": "mengubah role",
  "user.status_changed": "mengubah status akun",
  "user.password_reset": "membuat password sementara",
  "user.password_changed": "mengganti password",
  "athlete.updated": "mengubah profil atlet",
  "coach.updated": "mengubah profil pelatih",
  "training_session.created": "membuat sesi latihan",
  "training_session.updated": "mengubah sesi latihan",
  "training_session.deleted": "menghapus sesi latihan",
  "attendance.recorded": "menyimpan absensi",
  "training_group.created": "membuat kelompok latihan",
  "training_group.updated": "mengubah kelompok latihan",
  "training_group.deleted": "menghapus kelompok latihan",
  "time_trial.recorded": "mencatat time trial",
  "time_trial.updated": "mengubah time trial",
  "time_trial.deleted": "menghapus time trial",
  "competition.created": "membuat event",
  "competition.updated": "mengubah event",
  "competition.status_changed": "mengubah status event",
  "competition.attachment_updated": "mengunggah PDF event",
  "competition.attachment_removed": "menghapus PDF event",
  "competition_registration.created": "mendaftar event",
  "competition_registration.updated": "mengubah pendaftaran event",
  "competition_registration.cancelled": "membatalkan pendaftaran event",
  "competition_registration.exported": "mengunduh rekap pendaftar",
  "race_result.saved": "mencatat hasil lomba",
  "evaluation.created": "menulis evaluasi",
  "evaluation.updated": "mengubah evaluasi",
  "mfa.enabled": "mengaktifkan MFA",
  "mfa.disabled": "menonaktifkan MFA",
  "mfa.reset": "mereset MFA",
  "mfa.backup_codes_regenerated": "membuat ulang recovery code",
};
