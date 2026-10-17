import { randomInt } from "node:crypto";

// Tanpa karakter yang mudah tertukar saat dibacakan / diketik ulang (0/O, 1/l/I).
const LETTERS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALPHABET = LETTERS + DIGITS;

// Password awal akun baru: 12 karakter acak kriptografis, minimal 2 angka.
// Ditampilkan sekali ke admin untuk diserahkan; pengguna menggantinya di Keamanan akun.
export function generateTemporaryPassword(length = 12): string {
  const chars = Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)] as string);
  for (let i = 0; i < 2; i++) {
    chars[randomInt(length)] = DIGITS[randomInt(DIGITS.length)] as string;
  }
  // Pastikan dua posisi berbeda berisi angka (penimpaan di atas bisa jatuh di posisi yang sama).
  if (chars.filter((c) => DIGITS.includes(c)).length < 2) return generateTemporaryPassword(length);
  return chars.join("");
}
