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

- [ ] Create role guard.
- [ ] Create ownership guard.
- [ ] Create permission helpers.
- [ ] Test admin permission.
- [ ] Test coach permission.
- [ ] Test athlete permission.

## PHASE 4 — Dashboard Layout

- [ ] Global app shell.
- [ ] Sidebar.
- [ ] Header.
- [ ] Mobile navigation.
- [ ] Breadcrumb.
- [ ] Loading state.
- [ ] Error state.
- [ ] Empty state.

## PHASE 5 — Admin

- [ ] Admin overview.
- [ ] User list.
- [ ] Create user.
- [ ] Edit user.
- [ ] Activate/deactivate user (set `status` + `banned` bersamaan).
- [ ] Tombol reset MFA di detail user (pakai `resetUserMfaAction`).
- [ ] Saat role diubah menjadi ADMIN: panggil `revokeTrustedDevices()`.
- [ ] Athlete list.
- [ ] Athlete detail.
- [ ] Coach list.
- [ ] Coach detail.
- [ ] Training groups.

## PHASE 6 — Training

- [ ] Training session list.
- [ ] Create training session.
- [ ] Edit training session.
- [ ] Training detail.
- [ ] Filter by group/date.
- [ ] Athlete schedule view.

## PHASE 7 — Attendance

- [ ] Attendance page.
- [ ] Record attendance.
- [ ] Edit attendance.
- [ ] Athlete attendance history.
- [ ] Attendance summary.

## PHASE 8 — Time Trial

- [ ] Time trial list.
- [ ] Create time trial.
- [ ] Athlete selector.
- [ ] Discipline selector.
- [ ] Duration input.
- [ ] Validate duration.
- [ ] Time formatter.
- [ ] PB comparison.
- [ ] Update PB automatically.

## PHASE 9 — Personal Best

- [ ] PB list athlete.
- [ ] PB detail.
- [ ] PB dashboard card.
- [ ] PB history strategy.
- [ ] Highlight new PB.

## PHASE 10 — Competition

- [ ] Competition list.
- [ ] Competition detail.
- [ ] Create competition (deskripsi, periode pendaftaran, maxEntriesPerAthlete).
- [ ] Edit competition.
- [ ] Pilih nomor lomba yang dibuka (CompetitionDiscipline).
- [ ] Upload PDF event ke bucket privat (validasi MIME + magic bytes, maks 10 MB).
- [ ] Download PDF via signed URL setelah cek permission.
- [ ] Publish event (DRAFT → UPCOMING).

## PHASE 10b — Event Registration

- [ ] Permission helpers: `canRegisterAthlete`, `canViewRegistrations`, `canExportRegistrations`.
- [ ] `CompetitionRegistrationService.register()` (validasi periode, nomor lomba, status atlet, batas entry, seed time dari PB).
- [ ] Halaman `/athlete/events` (event terbuka + status pendaftaran saya).
- [ ] Halaman `/athlete/events/[id]` (detail, unduh PDF, DisciplinePicker, daftar).
- [ ] Ubah nomor lomba / batalkan pendaftaran sebelum deadline.
- [ ] Halaman `/coach/competitions/[id]/register` (daftarkan atlet binaan).
- [ ] Notifikasi in-app ke semua admin + badge di dashboard admin.
- [ ] Halaman `/admin/competitions/[id]/registrations` (ringkasan, Per Atlet / Per Nomor Lomba, filter, cari).
- [ ] Admin ubah/batalkan pendaftaran setelah deadline.
- [ ] Export Excel (`exceljs`, sheet Per Atlet + Per Nomor Lomba, escape formula injection).
- [ ] Export PDF (`@react-pdf/renderer`, kop event + daftar per nomor lomba).
- [ ] Audit log: registration create/update/cancel + export.
- [ ] Test: atlet daftarkan atlet lain, coach non-binaan, setelah deadline, event DRAFT, discipline tidak dibuka, non-admin export.

## PHASE 11 — Race Result

- [ ] Record race result.
- [ ] Rank.
- [ ] Medal.
- [ ] Round.
- [ ] DNS/DNF/DSQ support.
- [ ] PB comparison.
- [ ] Athlete competition history.

## PHASE 12 — Coach Evaluation

- [ ] Evaluation list.
- [ ] Create evaluation.
- [ ] Edit evaluation.
- [ ] Athlete evaluation view.
- [ ] Permission check.

## PHASE 13 — Dashboards

### Admin

- [ ] Total athlete.
- [ ] Total coach.
- [ ] Upcoming training.
- [ ] Upcoming competition.
- [ ] Pendaftaran event terbaru.
- [ ] Attendance summary.

### Coach

- [ ] My athletes.
- [ ] Today training.
- [ ] Latest trials.
- [ ] PB updates.

### Athlete

- [ ] Next training.
- [ ] Event yang membuka pendaftaran.
- [ ] PB cards.
- [ ] Latest time trial.
- [ ] Competition history.
- [ ] Latest evaluation.

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
