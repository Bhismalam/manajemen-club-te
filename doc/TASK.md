# TASK.md — Development Roadmap

## Status

Gunakan:

- [ ] Todo
- [~] In Progress
- [x] Done
- [!] Blocked

## PHASE 0 — Project Setup

- [x] Create Next.js project (Next.js 16.4, React 19, Turbopack, pnpm).
- [x] Setup TypeScript strict (+ `noUncheckedIndexedAccess`, `noImplicitOverride`).
- [x] Setup Tailwind (v4).
- [x] Setup shadcn/ui (style `base-nova`).
- [x] Setup ESLint (`no-explicit-any`, `consistent-type-imports`, kompatibel Prettier).
- [x] Setup Prettier (+ plugin Tailwind).
- [x] Setup PostgreSQL (lokal: database `web_atlit_dev`).
- [x] Setup Prisma (7.10, adapter `pg`, client di `src/generated/prisma`, instance di `src/lib/db/prisma.ts`).
- [x] Create `.env.example`.
- [x] Setup Git repository (branch `main` + `develop`).
- [x] Create base folder structure.

## PHASE 1 — Database

- [x] Create AthleteProfile model.
- [x] Create CoachProfile model.
- [x] Create TrainingGroup model.
- [x] Create TrainingSession model.
- [x] Create Attendance model.
- [x] Create Discipline model.
- [x] Create TimeTrial model.
- [x] Create PersonalBest model.
- [x] Generate Better Auth tables (User, Session, Account, Verification, TwoFactor) + additional fields role/status.
- [x] Create Competition model (termasuk field pendaftaran & attachment).
- [x] Create CompetitionDiscipline model.
- [x] Create CompetitionRegistration model.
- [x] Create CompetitionEntry model (dengan registrationId + composite FK).
- [x] Create Notification model.
- [x] Create AuditLog model.
- [x] Create RaceResult model.
- [x] Create CoachEvaluation model.
- [x] Run initial migration (`init`, termasuk CHECK constraints).
- [x] Create seed data (`pnpm db:seed`).
- [x] Konfigurasi dasar Better Auth (`src/lib/auth/auth.ts`: plugin admin + twoFactor, sign up publik dimatikan).

## PHASE 2 — Authentication

- [x] Setup Better Auth (Prisma adapter, `/api/auth/[...all]`).
- [x] Login page (`/login`).
- [x] Logout.
- [x] Session (DAL `src/lib/auth/session.ts`: `getCurrentUser`, `requireUser`, `requireRole`).
- [x] Protected routes (`src/proxy.ts` cek cookie + guard server per halaman).
- [x] Role redirect (`/dashboard` → dashboard sesuai role; role lain diarahkan ke dashboard sendiri).
- [x] Forgot password (`/forgot-password`, respons sama untuk email terdaftar/tidak).
- [x] Reset password (`/reset-password`, token 30 menit sekali pakai, semua sesi dicabut).
- [x] Disabled user handling (`banned` + hook `status`/`deletedAt`, session lama langsung tidak berlaku).
- [x] Rate limit login & reset password (storage database; login 5/menit, reset 3/5 menit).
- [ ] Pilih & pasang email provider production (mis. Resend). Saat ini `sendEmail` hanya log di development dan melempar error di production.

## PHASE 2b — MFA

- [x] Aktifkan plugin `twoFactor` (TOTP + backup codes).
- [x] Halaman `/login/two-factor` (OtpInput + recovery code).
- [x] Halaman `/settings/security` (aktif/nonaktif MFA, regenerate recovery codes).
- [x] Halaman `/settings/security/mfa-setup` (QR, verifikasi, recovery codes).
- [x] Guard `requireAdmin()` wajib MFA untuk semua page/action/route admin.
- [x] Paksa admin baru / seed admin setup MFA saat login pertama.
- [x] Trust device 30 hari untuk coach/atlet, dimatikan untuk admin (ditegakkan di server).
- [x] Admin reset MFA user lain (+ audit log): server action `resetUserMfaAction`. Tombol UI menyusul di Phase 5.
- [x] Script CLI pemulihan admin terakhir (`pnpm mfa:reset`).
- [x] Rate limit verifikasi TOTP (+ batas 5 percobaan per sesi & penguncian akun bawaan).
- [x] Test: admin tanpa MFA ditolak, recovery code sekali pakai, brute force TOTP.

## PHASE 3 — Authorization

- [x] Create role guard (`requireUser`, `requireRole`, `requireAdmin`, `requireActor`).
- [x] Create ownership guard (`requireAthleteAccess`, `requireTimeTrialEditAccess`, `athleteScope`).
- [x] Create permission helpers (`src/lib/permissions/policies.ts`).
- [x] Setup Vitest (`pnpm test`, ikut di `pnpm check`).
- [x] Test admin permission.
- [x] Test coach permission.
- [x] Test athlete permission.

## PHASE 4 — Dashboard Layout

- [x] Global app shell (`DashboardShell` di `admin|coach|athlete/layout.tsx`).
- [x] Sidebar (navy, penanda aktif marka "T").
- [x] Header (trigger sidebar, breadcrumb, menu pengguna).
- [x] Mobile navigation (drawer untuk semua role + bottom nav atlet).
- [x] Breadcrumb.
- [x] Loading state (`loading.tsx` + `PageSkeleton`).
- [x] Error state (`error.tsx` + `ErrorState`, tampilkan kode digest).
- [x] Empty state (`EmptyState`) + halaman "sedang dibangun" untuk menu yang belum ada.
- [x] Token warna & tipografi sesuai DESIGN.md, halaman 404.
- [ ] Permission denied state (saat ini role lain diarahkan ke dashboard sendiri).

## PHASE 5 — Admin

- [x] Admin overview (StatCard: atlet, pelatih, kelompok, akun nonaktif).
- [x] User list (cari, filter role/status, paginasi).
- [x] Create user (akun + profil atlet/pelatih sekaligus, password awal acak ditampilkan sekali).
- [x] Edit user (nama, email login).
- [x] Activate/deactivate user (set `status` + `banned` bersamaan, alasan wajib, sesi dicabut).
- [x] Tombol reset MFA di detail user (pakai `resetUserMfaAction`).
- [x] Ubah role (wajib punya profil yang sesuai; ke ADMIN → `revokeTrustedDevices()`).
- [x] Proteksi: tidak bisa mengubah akun sendiri; admin aktif terakhir tidak bisa dinonaktifkan/diubah role.
- [x] Ganti password di Keamanan akun (untuk password awal dari admin).
- [x] Athlete list (cari nama/nomor, filter kelompok/status, paginasi).
- [x] Athlete detail + edit profil (nama tersinkron ke akun).
- [x] Coach list.
- [x] Coach detail + edit profil.
- [x] Training groups (CRUD, pilih pelatih, hapus hanya jika kosong).
- [ ] Riwayat performa di detail atlet (menunggu Phase 8–12).
- [ ] Soft delete pengguna/atlet/pelatih (saat ini cukup dinonaktifkan).

## PHASE 6 — Training

- [x] Training session list (admin: semua kelompok, coach: kelompok binaan; dikelompokkan per hari).
- [x] Create training session (jam diinput WITA, disimpan UTC).
- [x] Edit training session.
- [x] Training detail (hapus diblokir jika sudah ada absensi/time trial).
- [x] Filter by group/date (default mulai hari ini).
- [x] Athlete schedule view (`/athlete/schedule`, jadwal kelompoknya mulai hari ini).
- [x] Isolasi: coach hanya bisa membuat/mengubah sesi kelompok miliknya (dicek server), sesi kelompok lain = 404.
- [ ] Sesi berulang (mis. tiap Senin & Rabu) — belum, setiap sesi dibuat satu per satu.

## PHASE 7 — Attendance

- [x] Attendance page (rekap `/admin/attendance`, `/coach/attendance`: per atlet + sesi belum diabsen, default 30 hari).
- [x] Record attendance (di detail sesi: Hadir/Izin/Sakit/Tidak hadir + catatan, "Tandai sisanya hadir").
- [x] Edit attendance (upsert per atlet, bisa diubah kapan saja).
- [x] Athlete attendance history (di `/athlete/schedule`: persentase + riwayat).
- [x] Attendance summary (persentase = Hadir ÷ sesi tercatat).
- [x] Aturan server: hanya kelompok yang dikelola, mulai hari sesi (jam klub), hanya anggota kelompok / yang sudah tercatat.
- [x] Zona waktu klub diganti ke WITA (Asia/Makassar, +08:00).
- [ ] Export rekap absensi (Excel/PDF) — post-MVP.

## PHASE 8 — Time Trial

- [x] Time trial list (admin, coach: binaan; atlet: `/athlete/time-trials` miliknya; filter atlet/nomor, badge PB).
- [x] Create time trial (batch: satu nomor lomba, banyak atlet; opsional terhubung ke sesi latihan).
- [x] Athlete selector (hanya atlet aktif yang boleh dicatat; "isi atlet dari kelompok sesi").
- [x] Discipline selector (dikelompokkan Renang / Finswimming).
- [x] Duration input (`58.27`, `1:05.32`, koma diterima, pratinjau langsung).
- [x] Validate duration (> 0, < 1 jam, maks. 2 desimal, detik < 60).
- [x] Time formatter (`src/lib/duration.ts`).
- [x] PB comparison (hasil simpan menandai PB baru + selisih).
- [x] Update PB automatically (PB dihitung ulang dari semua hasil; edit/hapus PB ikut benar).
- [x] Koreksi & hapus time trial (detail).

## PHASE 9 — Personal Best

- [x] PB list athlete (`/athlete/personal-bests`, kartu per nomor, dikelompokkan Renang/Finswimming).
- [x] PB detail (`/athlete/personal-bests/[disciplineId]` & `/admin/athletes/[id]/personal-bests/[disciplineId]`: PB, hasil pertama, peningkatan, grafik, semua hasil).
- [x] PB dashboard card (`PersonalBestCard`; 3 PB terbaru di Ringkasan atlet; PB di detail atlet admin).
- [x] PB history strategy: riwayat = semua time trial & hasil lomba; tabel `personal_best` hanya nilai terbaik saat ini (dihitung ulang).
- [x] Highlight new PB (badge "PB baru" untuk PB ≤ 30 hari; "PB saat itu" di riwayat).
- [x] Grafik perkembangan waktu (SVG, sumbu y dibalik "lebih cepat ↑", tick bulat, tooltip mouse & keyboard, tabel sebagai alternatif).
- [x] Perbaikan tanggal: timestamp ditampilkan dengan `formatClubDate`; tanggal lomba dinormalkan ke siang jam klub.
- [x] Halaman "Atlet Binaan" pelatih + PB atlet binaan (Phase 13).

## PHASE 10 — Competition

- [x] Competition list (admin semua; pelatih event terbit + draft buatannya; cari & filter status).
- [x] Competition detail (ringkasan, PDF, panel status; read-only untuk yang bukan pengelola).
- [x] Create competition (deskripsi, periode pendaftaran jam WITA, maxEntriesPerAthlete). Event baru selalu DRAFT.
- [x] Edit competition (admin, atau pelatih pembuat event; event selesai/batal tidak bisa diubah).
- [x] Pilih nomor lomba yang dibuka (CompetitionDiscipline); nomor yang sudah punya pendaftar terkunci.
- [x] Supabase Storage: `src/lib/storage/supabase.ts` (server-only, service role), `pnpm storage:setup` (bucket `private-docs` & `public-media`).
- [x] Upload PDF event ke bucket privat lewat signed upload URL (validasi nama/MIME/ukuran, lalu magic bytes `%PDF-` di server; file tidak valid dihapus). Maks 10 MB.
- [x] Download PDF via signed URL 5 menit setelah cek permission (`/api/competitions/[id]/attachment`).
- [x] Publish event (DRAFT → UPCOMING) dengan daftar syarat; UPCOMING → ONGOING → COMPLETED; batal; kembali ke draft hanya jika belum ada pendaftar.
- [x] Uji upload/unduh PDF dengan project Supabase asli (secret key `sb_secret_…`): upload tanpa apikey + CORS, unduh `Content-Disposition: attachment`, file palsu ditolak & dihapus, bucket menolak MIME lain, ganti/hapus PDF membersihkan objek lama.
- [ ] Bersihkan objek PDF yatim (upload yang tidak pernah dikonfirmasi) — job terjadwal, nanti.

## PHASE 10b — Event Registration

- [x] Permission helpers: `canRegisterAthlete`, `canViewRegistration`, `canExportRegistrations` (sudah ada sejak Phase 3) + `competitionScope`.
- [x] `competition-registration-service.ts`: `saveRegistration` (validasi periode, nomor lomba dibuka, status atlet, batas entry, seed time = snapshot PB), `cancelRegistration`, daftar ulang setelah batal, nomor dengan hasil lomba tidak bisa dihapus.
- [x] Halaman `/athlete/events` (event terbit, deadline terdekat dulu, badge "Pendaftaran dibuka · Tutup N hari lagi" / "Terdaftar").
- [x] Halaman `/athlete/events/[id]` (info event, unduh PDF, DisciplinePicker + PB per nomor, daftar). athleteId selalu dari session.
- [x] Ubah nomor lomba / batalkan pendaftaran sebelum deadline (ConfirmDialog); setelah deadline read-only + "Hubungi admin".
- [x] Halaman `/coach/competitions/[id]/register` (pilih atlet binaan, daftar atlet binaan terdaftar); tombol di detail event.
- [x] Notifikasi in-app ke semua admin aktif (kecuali pelaku) + kartu "Pendaftaran baru" & daftar notifikasi di ringkasan admin; dibaca otomatis saat rekap event dibuka, atau "Tandai semua dibaca".
- [x] Halaman `/admin/competitions/[id]/registrations` (ringkasan, Per Atlet / Per Nomor Lomba, filter nomor & jenis kelamin, cari, tampilkan yang dibatalkan).
- [x] Admin daftarkan/ubah/batalkan pendaftaran kapan saja selama event UPCOMING/ONGOING (form di halaman rekap, ikon ubah per baris).
- [x] Export Excel (`exceljs`, sheet Per Atlet + Per Nomor Lomba, header beku + autofilter, escape formula injection).
- [x] Export PDF (`@react-pdf/renderer`, kop event + daftar per nomor lomba urut seed time, nomor halaman).
- [x] Audit log: `competition_registration.created/updated/cancelled/exported`.
- [x] Test: atlet daftarkan atlet lain, coach non-binaan, setelah deadline, event DRAFT, nomor tidak dibuka, batas entry, atlet nonaktif, non-admin export (uji service + E2E), plus tes unit `src/lib/registrations.ts`.
- [x] Perbaikan lintas fitur: semua Server Action yang mengubah halaman memanggil `refresh()` (bukan `router.refresh()` di client).

## PHASE 11 — Race Result

- [x] Record race result: lembar input per event → per nomor lomba (`/admin/results/[id]`, `/coach/results/[id]`), simpan batch hanya baris yang berubah, status "— belum ada —" menghapus hasil.
- [x] Rank (1–999, hanya untuk finish).
- [x] Medal (emas/perak/perunggu; otomatis dari peringkat 1–3 di final / final langsung, bisa diubah manual).
- [x] Round (final langsung, heat, semifinal, final; hasil per entry + babak).
- [x] DNS/DNF/DSQ support (tanpa waktu, peringkat, dan medali; tidak memengaruhi PB).
- [x] PB comparison: PB dihitung ulang dari time trial + hasil FINISHED (`recomputePersonalBest`), toast "PB baru", selisih terhadap seed time (PB saat mendaftar), badge PB.
- [x] Athlete competition history: `/athlete/results` + bagian "Riwayat lomba" di detail atlet admin, rekap medali.
- [x] Aturan: hasil hanya untuk entry pendaftaran aktif; event berlangsung/selesai (atau akan datang yang tanggal mulainya sudah tiba); pelatih hanya atlet binaan; pendaftaran yang punya hasil tidak bisa dibatalkan.
- [x] Audit `race_result.saved` (per batch, berisi perubahan per entry).
- [x] Token warna medali `gold` / `silver` / `bronze` (light & dark).

## PHASE 12 — Coach Evaluation

- [x] Evaluation list (`/coach/evaluations`, filter per atlet binaan, paginasi).
- [x] Create evaluation (`/coach/evaluations/new?athlete=`): atlet binaan aktif, tanggal ≤ hari ini, kekuatan, kekurangan, fokus perbaikan, target berikutnya, catatan.
- [x] Edit evaluation (`/coach/evaluations/[id]`): pelatih penulis selama masih membina atlet; atlet tidak bisa dipindah; evaluasi pelatih lain read-only. Tidak ada hapus (riwayat pembinaan).
- [x] Athlete evaluation view (`/athlete/evaluations`) + bagian "Evaluasi pelatih" di detail atlet admin.
- [x] Permission check: `athleteScope` di semua query (404 di luar scope), `canEditEvaluation`, hanya pelatih dengan profil aktif yang menulis; admin bisa mengoreksi lewat action. Audit `evaluation.created/updated`.

## PHASE 13 — Dashboards

### Admin

- [x] Total athlete & total coach (aktif), pendaftaran baru (belum dibaca), kehadiran 30 hari.
- [x] Upcoming training (5 sesi terdekat).
- [x] Upcoming competition (jumlah pendaftar + status periode pendaftaran, link ke rekap).
- [x] Pendaftaran event terbaru (notifikasi) + ikon lonceng dengan jumlah belum dibaca di header admin.
- [x] Attendance summary per kelompok (30 hari).
- [x] Aktivitas terbaru (audit log dengan label Bahasa Indonesia).

### Coach

- [x] My athletes: halaman `/coach/athletes` + detail `/coach/athletes/[id]` (data diri, kehadiran, PB + grafik, riwayat lomba, evaluasi).
- [x] Today training (status absensi; jika kosong, latihan berikutnya).
- [x] Latest trials.
- [x] PB updates (PB bulan ini).
- [x] Perlu evaluasi (belum pernah / > 30 hari, `isEvaluationDue`) + event terdekat dengan jumlah atlet binaan terdaftar.

### Athlete

- [x] Next training (hero).
- [x] Event yang membuka pendaftaran (tombol Daftar) + lomba berikutnya yang sudah didaftari.
- [x] PB cards + grafik perkembangan (nomor time trial terakhir).
- [x] Latest time trial, kehadiran, jumlah medali.
- [x] Competition history (2 event terakhir).
- [x] Latest evaluation.
- [x] Halaman `/athlete/profile` (data diri read-only, kehadiran, link keamanan akun).

### Akun

- [x] Wajib ganti password saat login pertama / setelah password sementara (`User.mustChangePassword`, halaman `/settings/change-password`).
- [x] Admin membuat password sementara untuk pengguna yang lupa password (sesi dicabut, audit `user.password_reset`).

## PHASE 14 — Public Website

- [ ] Home.
- [ ] About.
- [ ] Programs.
- [ ] Coaches.
- [ ] Achievements.
- [ ] Events.
- [ ] Gallery.
- [ ] Contact.
- [ ] Responsive navbar.
- [ ] Footer.

## PHASE 15 — Security

- [ ] Server-side validation.
- [ ] RBAC test.
- [ ] IDOR test.
- [ ] Rate limiting (endpoint non-auth: pendaftaran event, export, contact form).
- [ ] Pastikan IP klien terbaca benar di Vercel (`x-forwarded-for`), karena rate limit auth berbasis IP.
- [ ] Evaluasi token session di body respons sign-in Better Auth (cookie tetap HttpOnly; mitigasi utama: CSP + cegah XSS).
- [ ] Cek apakah kode TOTP bisa dipakai ulang dalam window 30 detik; jika ya, tambahkan pencegahan replay.
- [ ] Secure headers.
- [ ] Upload validation.
- [ ] Error sanitization.
- [ ] Audit logging.
- [ ] Dependency audit.

## PHASE 16 — Testing

- [ ] Unit test critical services.
- [ ] Permission test.
- [ ] PB update test.
- [ ] Auth test.
- [ ] MFA test.
- [ ] Registration service test.
- [ ] Export test (isi Excel/PDF sesuai data).
- [ ] Form validation test.
- [ ] Mobile responsive test.
- [ ] Browser test.

## PHASE 17 — Deployment

- [ ] Setup production DB.
- [ ] Setup Vercel.
- [ ] Environment variables (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, email provider).
- [ ] Migration production.
- [ ] Seed admin (wajib setup MFA saat login pertama).
- [ ] Setup bucket storage privat untuk PDF event.
- [ ] Setup domain.
- [ ] HTTPS verification.
- [ ] Error monitoring.
- [ ] Backup verification.

## PHASE 18 — Post MVP

- [ ] Notification lanjutan (push).
- [ ] Email notifikasi pendaftaran event.
- [ ] WhatsApp integration.
- [ ] Email reminder.
- [ ] Payments.
- [ ] PDF/Excel report lain (selain rekap pendaftar event).
- [ ] Passkey (WebAuthn).
- [ ] Parent account.
- [ ] Advanced analytics.
- [ ] Mobile app.

## Recommended Coding Order

Jangan membuat semuanya sekaligus.

Urutan terbaik:

1. Setup.
2. Database.
3. Auth + MFA.
4. RBAC.
5. User/Athlete/Coach.
6. Training.
7. Attendance.
8. Time Trial.
9. PB.
10. Competition.
11. Event Registration + Export.
12. Result.
13. Evaluation.
14. Dashboard.
15. Public website.
16. Security hardening.
17. Testing.
18. Deploy.
