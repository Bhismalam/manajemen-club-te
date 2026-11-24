# DEPLOYMENT.md — Panduan Deploy (Vercel + Supabase)

Arsitektur produksi:

- **Aplikasi**: Vercel, region `sin1` (Singapura, `vercel.json`), deploy otomatis dari branch `main`.
- **Database**: Supabase Postgres, project yang sama dengan Storage (region Singapura).
- **File**: Supabase Storage (bucket `private-docs` dan `payment-proofs`, dibuat dengan `pnpm storage:setup`).

## 1. Siapkan database Supabase

1. Buka project Supabase → tombol **Connect** (atas).
2. Salin dua connection string dan ganti `[YOUR-PASSWORD]` dengan password database:
   - **Transaction pooler** (port **6543**) → `DATABASE_URL` (dipakai aplikasi).
   - **Session pooler** (port **5432**) → `DIRECT_URL` (dipakai migrasi).
     Lupa password database? **Project Settings → Database → Reset database password**.
3. **Project Settings → Database → SSL Configuration → Download certificate**. Buka file `.crt` dengan text editor; seluruh isinya (dari `-----BEGIN CERTIFICATE-----` sampai `-----END CERTIFICATE-----`) menjadi `DATABASE_CA_CERT`. Dengan ini koneksi TLS diverifikasi penuh.

Jangan menambahkan `sslmode=...` ke URL; pengaturan SSL diambil dari `DATABASE_CA_CERT` (`src/lib/db/pg-config.ts`).

Jalankan `pnpm storage:setup` sekali dari laptop agar semua bucket ada, termasuk `payment-proofs` untuk bukti SPP. Tanpa bucket ini, unggah bukti akan gagal.

## 2. Buat secret Better Auth produksi

```bash
openssl rand -base64 32
```

Hasilnya menjadi `BETTER_AUTH_SECRET`. **Jangan** memakai secret development.

## 3. Buat project Vercel

1. https://vercel.com → login dengan GitHub → **Add New → Project** → import `Bhismalam/manajemen-club-te`.
2. Framework terdeteksi **Next.js**. Build command dibiarkan default (Vercel memakai script `vercel-build`).
3. **Environment Variables** (centang **Production** saja):

   | Nama                        | Nilai                                                     |
   | --------------------------- | --------------------------------------------------------- |
   | `DATABASE_URL`              | Transaction pooler (6543)                                 |
   | `DIRECT_URL`                | Session pooler (5432)                                     |
   | `DATABASE_CA_CERT`          | Isi sertifikat CA Supabase (boleh multi-baris)            |
   | `BETTER_AUTH_SECRET`        | Hasil langkah 2                                           |
   | `BETTER_AUTH_URL`           | `https://<nama-project>.vercel.app` (atau domain sendiri) |
   | `SUPABASE_URL`              | Sama seperti di `.env.local`                              |
   | `SUPABASE_SERVICE_ROLE_KEY` | Sama seperti di `.env.local` (secret key `sb_secret_…`)   |

   `SEED_PASSWORD` **tidak** diisi (seed demo menolak berjalan di production).

4. **Deploy**. Setelah selesai, buka **Settings → Environments → Production → Branch Tracking** dan pastikan branch-nya `main`.
5. Jika alamat akhir berbeda dari `BETTER_AUTH_URL`, perbaiki nilainya lalu **Redeploy**.

Saat build production, `scripts/vercel-build.mjs` menjalankan `prisma migrate deploy` lalu data master nomor lomba (`scripts/seed-master.ts`) sebelum `next build`. Preview deployment tidak pernah mengubah database produksi.

## 4. Buat admin pertama (sekali)

Database produksi masih kosong (tanpa data demo). Di laptop, buat file **`.env.production.local`** (sudah di-ignore git):

```bash
DATABASE_URL="<transaction pooler>"
DIRECT_URL="<session pooler>"
DATABASE_CA_CERT="-----BEGIN CERTIFICATE-----
...isi sertifikat...
-----END CERTIFICATE-----"
```

Lalu:

```bash
pnpm admin:create --env .env.production.local --email <email-admin> --name "<Nama Admin>"
```

Password sementara tampil **sekali**. Login di alamat Vercel → wajib membuat password baru → wajib mengaktifkan MFA (aplikasi authenticator) → simpan recovery code.

Setelah itu buat akun pelatih & atlet dari menu **Pengguna** (masing-masing mendapat password sementara).

Setelah login, atur **tarif SPP** di menu **SPP** agar tagihan bulanan mulai berjalan. Bulan sebelum tarif pertama tidak ditagih.

## 5. Pemeriksaan setelah deploy

- [ ] Log build Vercel berisi `prisma migrate deploy` dan `Data master: 19 nomor lomba`.
- [ ] `https://…/` mengarah ke `/login`; gembok HTTPS valid.
- [ ] Login admin → ganti password → setup MFA → dashboard admin.
- [ ] Buat event, unggah PDF (Supabase Storage), unduh PDF.
- [ ] Buat akun atlet, login, daftar event, cek rekap & export Excel/PDF.
- [ ] Atur tarif SPP, atlet kirim bukti, admin lihat bukti lalu setujui.
- [ ] Header keamanan (`Content-Security-Policy`, `Strict-Transport-Security`) ada di respons (DevTools → Network).

## 6. Verifikasi PWA TE sebelum rilis

PWA memakai manifest bawaan Next.js, tanpa tambahan layanan atau environment variable. Pastikan URL produksi memakai HTTPS dan `BETTER_AUTH_URL` sesuai origin aplikasi.

Verifikasi lokal 21 November 2026 pada Next.js 16.4.6: `pnpm check` (188 unit test), production build, dan regresi E2E PWA (17/17 tes, termasuk setup akun) berhasil. Pemeriksaan advisori npm bawaan Next.js melaporkan `affected: false`. Checklist perangkat/HTTPS berikut tetap belum selesai dan harus dilakukan pada deployment yang akan dirilis.

- [ ] Buka `/manifest.webmanifest` tanpa login: nama `TE`, mode `standalone`, URL awal `/dashboard`, dan ikon dapat dimuat tanpa redirect ke login.
- [ ] Android Chrome: buka aplikasi lewat browser, login, pilih menu akun → **Pasang TE**, lalu pasang melalui browser. Jika tombol pemasangan belum tersedia, gunakan petunjuk menu browser.
- [ ] iPhone Safari: buka menu akun → **Pasang TE**, lalu Bagikan → Tambahkan ke Layar Utama. Jika tersedia, aktifkan **Buka sebagai App**.
- [ ] Buka ikon TE dari home screen: nama/ikon benar, tampilan standalone, dashboard sesuai peran jika sesi valid, login jika sesi berakhir. Kewajiban ganti password dan MFA admin tetap berlaku.
- [ ] Menu **Pasang TE** tidak muncul saat dibuka dalam mode standalone.
- [ ] Periksa portrait/landscape, notch, indikator gestur, keyboard saat mengisi formulir, dan pinch zoom. Header, drawer, tombol simpan, navigasi bawah, serta dialog tetap terjangkau.
- [ ] Saat halaman terbuka, matikan koneksi: pesan **Koneksi terputus** muncul. Nyalakan kembali: pesan hilang dan isian tetap ada. Status browser hanya petunjuk; hasil permintaan server menentukan keberhasilan penyimpanan.
- [ ] Pada akun/data uji, putuskan respons penyimpanan absensi/time trial: loading berhenti dan pesan hasil belum pasti muncul. Periksa data di tab lain sebelum mengirim ulang; tidak ada pengiriman ulang otomatis.

Tanpa internet, pembukaan dari kondisi aplikasi tertutup mengikuti penanganan browser. Versi ini tidak menyediakan akses data offline, penyimpanan isian setelah reload, sinkronisasi, atau push notification. Jangan menganggap respons yang hilang berarti data pasti belum tersimpan.

## 7. Operasional

- **Log & error**: Vercel → project → **Logs** (runtime). Error di halaman menampilkan kode referensi (digest) yang bisa dicari di log.
- **Supabase free tier**: project dijeda otomatis jika tidak ada aktivitas sekitar 1 minggu; buka dashboard Supabase untuk mengaktifkan lagi. Pertimbangkan paket Pro bila aplikasi dipakai rutin (juga memberi backup harian).
- **Backup**: paket Free tidak menyediakan backup otomatis yang bisa diunduh. Minimal ekspor berkala dari dashboard Supabase atau `pg_dump` memakai `DIRECT_URL`.
- **Reset MFA darurat** (admin kehilangan HP & recovery code): `pnpm mfa:reset --email <email> --reason "..." --yes` dengan env produksi.
- **Lupa password**: belum ada layanan email; admin memakai **Buat password sementara** di detail user.
- **Rilis berikutnya**: kerjakan di `develop`, jalankan `pnpm test:all`, lalu merge `develop` → `main` dan push; Vercel deploy otomatis dan menjalankan migrasi baru.
