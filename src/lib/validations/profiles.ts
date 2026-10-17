import { z } from "zod";

import { GENDER_VALUES, isValidDateString, optionalText } from "./common";

// Field profil atlet & pelatih, dipakai di form tambah pengguna dan edit profil.

export const athleteNumberField = z
  .string()
  .trim()
  .min(1, "Nomor atlet wajib diisi.")
  .max(30, "Nomor atlet maksimal 30 karakter.")
  .regex(/^[A-Za-z0-9-]+$/, "Nomor atlet hanya boleh huruf, angka, dan tanda hubung.");

export const athleteProfileFields = {
  athleteNumber: athleteNumberField,
  birthDate: z.string(),
  gender: z.enum(GENDER_VALUES, "Pilih jenis kelamin."),
  joinDate: z.string(),
  phone: optionalText(30, "Nomor HP"),
  trainingGroupId: z.string(),
};

export const coachProfileFields = {
  phone: optionalText(30, "Nomor HP"),
  specialization: optionalText(100, "Spesialisasi"),
};

type DateCheckContext = {
  addIssue: (issue: { code: "custom"; message: string; path: string[] }) => void;
};

// Tanggal lahir & bergabung: wajib, valid, tidak di masa depan, bergabung setelah lahir.
export function checkAthleteDates(
  data: { birthDate: string; joinDate: string },
  ctx: DateCheckContext,
  today: string = new Date().toISOString().slice(0, 10),
) {
  if (!isValidDateString(data.birthDate)) {
    ctx.addIssue({ code: "custom", message: "Tanggal lahir wajib diisi.", path: ["birthDate"] });
  } else if (data.birthDate > today) {
    ctx.addIssue({
      code: "custom",
      message: "Tanggal lahir tidak boleh di masa depan.",
      path: ["birthDate"],
    });
  }

  if (!isValidDateString(data.joinDate)) {
    ctx.addIssue({ code: "custom", message: "Tanggal bergabung wajib diisi.", path: ["joinDate"] });
  } else if (data.joinDate > today) {
    ctx.addIssue({
      code: "custom",
      message: "Tanggal bergabung tidak boleh di masa depan.",
      path: ["joinDate"],
    });
  } else if (isValidDateString(data.birthDate) && data.joinDate < data.birthDate) {
    ctx.addIssue({
      code: "custom",
      message: "Tanggal bergabung harus setelah tanggal lahir.",
      path: ["joinDate"],
    });
  }
}
