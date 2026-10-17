import type { Gender, UserRole, UserStatus } from "@/generated/prisma/enums";

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
