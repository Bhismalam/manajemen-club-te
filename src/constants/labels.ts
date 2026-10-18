import type {
  AttendanceStatus,
  CompetitionLevel,
  CompetitionStatus,
  Gender,
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
