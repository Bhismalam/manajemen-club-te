# TESTING.md — Strategi & Cara Menjalankan Test

Tiga lapis test, dari yang paling cepat:

| Perintah                | Isi                                                              | Database                  | Waktu  |
| ----------------------- | ---------------------------------------------------------------- | ------------------------- | ------ |
| `pnpm test`             | Unit test fungsi murni (`src/**/*.test.ts`)                      | Tidak ada                 | ±1 dtk |
| `pnpm test:integration` | Service + Prisma + aturan izin (`src/**/*.int.test.ts`)          | Database test             | ±2 dtk |
| `pnpm test:e2e`         | Browser (Playwright) terhadap production build (`e2e/*.spec.ts`) | Database test (data seed) | ±1 mnt |
| `pnpm test:all`         | Ketiganya berurutan                                              |                           |        |

`pnpm check` (lint, typecheck, format, unit test) tetap cepat dan dipakai sebelum setiap commit. Jalankan `pnpm test:all` sebelum merge ke `develop` / deploy.

## Database test

- Integration & E2E **tidak pernah** memakai database development. URL-nya dari `TEST_DATABASE_URL`, atau `DATABASE_URL` dengan nama database ditambah `_test` (mis. `web_atlit_dev` → `web_atlit_dev_test`). Lihat `src/test/test-database.ts`.
- Pengaman: test menolak berjalan jika nama database tidak berakhiran `_test`, karena isinya dikosongkan.
- Database dibuat otomatis bila belum ada, lalu `prisma migrate deploy`.
- Integration: semua tabel dikosongkan sebelum setiap test; data dibuat dengan factory di `src/test/factories.ts`.
- E2E: database di-reset lalu diisi `prisma/seed.ts` di awal setiap run (`e2e/global.setup.ts`).

## Integration test

| File                                                        | Cakupan                                                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/services/competition-registration-service.int.test.ts` | Pendaftaran: seed time dari PB, batas nomor, nomor tidak dibuka, IDOR atlet, pelatih non-binaan, deadline, DRAFT, atlet nonaktif, daftar ulang, notifikasi admin, rekap. |
| `src/services/personal-best.int.test.ts`                    | PB dari time trial & hasil lomba: PB baru, koreksi/hapus menurunkan PB, DNS tidak dihitung, izin pelatih.                                                                |
| `src/services/access-control.int.test.ts`                   | RBAC/IDOR data atlet, scope daftar atlet, sesi latihan & absensi, event DRAFT, publish, nomor terkunci, evaluasi.                                                        |
| `src/features/exports/roster-export.int.test.ts`            | Isi Excel (2 sheet, data, tanpa formula, nama `=HYPERLINK` di-escape) & PDF valid; rate limit aksi.                                                                      |

Modul `server-only` diganti stub (`vitest.integration.config.mts`) dan env Supabase dikosongkan: integration test tidak memanggil layanan luar.

## E2E (Playwright)

- `playwright.config.ts` menjalankan `pnpm build && pnpm start -p 3100` dengan `DATABASE_URL` database test. Port 3000 (dev server) tidak dipakai.
- Browser: Google Chrome yang terpasang (`channel: "chrome"`). Tanpa Chrome (mis. CI): `pnpm exec playwright install chromium` lalu `PW_CHANNEL=chromium pnpm test:e2e`.
- `e2e/global.setup.ts` login semua role, mengaktifkan MFA admin seed lewat API, dan menyimpan session ke `e2e/.auth/` (di-ignore git).
- Setiap konteks API memakai IP klien sendiri (`x-forwarded-for`) agar rate limit login per IP tidak saling mengganggu.

| Spec                   | Cakupan                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts`         | Login salah/benar, logout, wajib ganti password awal, token tidak di body, MFA admin, TOTP replay, recovery code sekali pakai, admin tanpa MFA.                                   |
| `access.spec.ts`       | Matriks akses tamu/atlet/pelatih/admin (termasuk `/` → login/dashboard), IDOR (atlet non-binaan, event DRAFT & PDF-nya, export admin), header keamanan, `robots.txt` + `noindex`. |
| `registration.spec.ts` | Atlet mendaftar event → notifikasi & rekap admin → isi file Excel hasil unduhan.                                                                                                  |
| `mobile.spec.ts`       | Viewport HP: tidak ada scroll horizontal di halaman login & dashboard 3 role, navigasi bawah atlet.                                                                               |

Laporan HTML: `pnpm exec playwright show-report`. Saat gagal, screenshot & trace ada di `test-results/`.

## Menambah test

- Aturan izin baru: fungsi murni + unit test di `policies.test.ts`, lalu skenario IDOR di `access-control.int.test.ts`.
- Service baru: integration test dengan factory; jangan bergantung pada data seed.
- Alur UI baru yang kritis: satu spec E2E untuk jalur utama saja; detail aturan cukup di integration test.
