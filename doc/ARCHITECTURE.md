# ARCHITECTURE.md — System Architecture

## 1. Architecture Style

Gunakan modular monolith untuk MVP.

Alasan:

- Lebih cepat dibangun.
- Lebih mudah di-deploy.
- Lebih sederhana daripada microservices.
- Masih dapat dipisah di masa depan jika traffic meningkat.

## 2. High-Level Architecture

```text
Browser
   |
   v
Next.js Application
   |
   +-- Public Website
   +-- Admin Dashboard
   +-- Coach Dashboard
   +-- Athlete Dashboard
   |
   v
Server Actions / API Routes
   |
   v
Service Layer
   |
   v
Repository / Prisma
   |
   v
PostgreSQL
```

External:

- Object Storage.
- Email provider.
- WhatsApp provider pada Phase 2.

## 3. Application Modules

- Authentication.
- User Management.
- Athlete Management.
- Coach Management.
- Training.
- Attendance.
- Time Trial.
- Personal Best.
- Competition.
- Competition Registration.
- Export (Excel/PDF).
- Race Result.
- Evaluation.
- Notification.
- Public Content.

## 4. Request Flow

Contoh input hasil time trial:

```text
Coach UI
  -> submit form
  -> Zod validation
  -> Authorization
  -> TimeTrialService
  -> Save time trial
  -> PersonalBestService
  -> Compare current PB
  -> Update PB when faster
  -> Return result
```

Contoh pendaftaran event:

```text
Athlete/Coach UI
  -> submit form (competitionId, athleteId, disciplineIds[])
  -> Zod validation
  -> Authorization: canRegisterAthlete(currentUser, athleteId)
  -> CompetitionRegistrationService.register()
       -> cek event UPCOMING dan dalam periode pendaftaran
       -> cek atlet aktif
       -> cek disciplineIds termasuk CompetitionDiscipline
       -> cek maxEntriesPerAthlete
       -> ambil PB per discipline untuk seedTimeMs
       -> transaction: upsert CompetitionRegistration + replace CompetitionEntry
  -> NotificationService: notifikasi ke semua admin
  -> AuditLog
  -> Return result
```

Contoh export rekap pendaftar:

```text
Admin klik "Download Excel/PDF"
  -> GET /api/admin/competitions/{id}/registrations/export?format=xlsx|pdf
  -> Authorization: requireAdmin (role ADMIN + MFA terverifikasi)
  -> CompetitionRegistrationService.getRoster(competitionId)
  -> ExportService.toXlsx(roster) | ExportService.toPdf(roster)
  -> Response stream + Content-Disposition: attachment
```

## 5. Frontend Architecture

### Public

Route contoh:

- `/`
- `/about`
- `/programs`
- `/coaches`
- `/achievements`
- `/events`
- `/gallery`
- `/contact`

### Admin

- `/admin`
- `/admin/users`, `/admin/users/new` (`?role=COACH|ATHLETE|ADMIN`), `/admin/users/[id]`
- `/admin/athletes`, `/admin/athletes/[id]`
- `/admin/coaches`, `/admin/coaches/[id]`
- `/admin/groups`, `/admin/groups/new`, `/admin/groups/[id]`
- `/admin/training`
- `/admin/competitions`
- `/admin/competitions/[id]` (detail, nomor lomba, PDF, periode pendaftaran)
- `/admin/competitions/[id]/registrations` (rekap pendaftar + download)

### Coach

- `/coach`
- `/coach/training`
- `/coach/attendance`
- `/coach/athletes`
- `/coach/time-trials`
- `/coach/competitions`
- `/coach/competitions/[id]/register` (daftarkan atlet binaan)
- `/coach/evaluations`

### Athlete

- `/athlete`
- `/athlete/profile`
- `/athlete/schedule`
- `/athlete/events` (event yang membuka pendaftaran + status pendaftaran saya)
- `/athlete/events/[id]` (detail, unduh PDF, pilih nomor lomba)
- `/athlete/results`
- `/athlete/personal-bests`
- `/athlete/evaluations`

### Auth & Settings (semua role)

- `/login`
- `/login/two-factor` (input kode TOTP / recovery code)
- `/forgot-password`
- `/reset-password`
- `/settings/security` (ganti password, aktif/nonaktif MFA, regenerate recovery codes)
- `/settings/security/mfa-setup` (wajib untuk admin yang belum enroll)

### API Route Handlers

- `/api/auth/[...all]` (handler Better Auth)
- `/api/admin/competitions/[id]/registrations/export?format=xlsx|pdf`
- `/api/competitions/[id]/attachment` (redirect ke signed URL PDF setelah cek permission)

## 6. Backend Architecture

MVP dapat menggunakan Next.js Server Actions + Route Handlers.

Service layer:

- `AuthService`
- `AthleteService`
- `CoachService`
- `TrainingService`
- `AttendanceService`
- `TimeTrialService`
- `PersonalBestService`
- `CompetitionService`
- `CompetitionRegistrationService`
- `UserAdminService` (`user-admin-service.ts`: buat akun + profil lewat API admin Better Auth, status/role)
- `TrainingGroupService`
- `ExportService` (xlsx via `exceljs`, PDF via `@react-pdf/renderer`, keduanya di server)
- `NotificationService`
- `StorageService` (upload + signed URL)
- `EvaluationService`

## 7. Data Access

Prisma menjadi primary ORM.

Repository dipakai jika query mulai kompleks.

Contoh:

```text
TimeTrialService
   |
TimeTrialRepository
   |
Prisma
```

## 8. Authentication

Library: **Better Auth** dengan Prisma adapter, session berbasis database + cookie.

Plugin:

- `twoFactor`: TOTP + backup/recovery codes.
- `admin`: role, ban/suspend user, impersonation dimatikan.
- `passkey`: Phase 2 (post-MVP).
- `nextCookies`: meneruskan cookie dari `auth.api` di Server Action.

File:

- `src/lib/auth/auth.ts`: konfigurasi server (hanya server).
- `src/lib/auth/auth-client.ts`: client untuk komponen `"use client"` (`signIn`, `signOut`, `requestPasswordReset`, `resetPassword`).
- `src/lib/auth/session.ts`: Data Access Layer (`getCurrentUser`, `requireUser`, `requireRole`).
- `src/lib/auth/routes.ts`: path login/dashboard per role dan `safeCallbackUrl` (anti open redirect).
- `src/proxy.ts`: pengecekan optimistis keberadaan cookie session untuk `/admin`, `/coach`, `/athlete`, `/settings`, `/dashboard`.
- `src/app/dashboard/route.ts`: setelah login, redirect ke dashboard sesuai role.

Aturan baca session (Next.js 16 + `cacheComponents`):

- Session dibaca di komponen di dalam `<Suspense>`, jangan di-await di level atas layout.
- `getCurrentUser` hanya di-dedupe per request (`React.cache`), **tidak** memakai `use cache: private`, supaya ban/perubahan role langsung berlaku.
- Setiap page, Server Action, dan Route Handler memanggil guard sendiri. `proxy.ts` bukan pengaman utama.

Akun nonaktif ditolak di dua lapis: `banned` (plugin admin) saat sign-in, dan hook `session.create.before` yang mengecek `status`/`deletedAt`. `getCurrentUser` juga mengembalikan `null` untuk session milik akun yang sudah dinonaktifkan.

Session minimal membawa:

- userId.
- role.

Informasi sensitif tetap diambil dari server/database.

Alur login 2 tahap:

```text
POST email + password
  -> Better Auth verifikasi password
  -> jika twoFactorEnabled: belum ada session penuh, redirect /login/two-factor
       -> verifikasi TOTP / recovery code -> session dibuat
  -> jika role ADMIN dan twoFactorEnabled = false:
       -> session terbatas, semua /admin/* dan admin action diarahkan ke /settings/security/mfa-setup
  -> redirect dashboard sesuai role
```

Guard server-side:

- `requireUser()`: session valid dan user status ACTIVE.
- `requireRole(role)`.
- `requireAdmin()`: role ADMIN + `twoFactorEnabled = true`. Dipakai di semua page, server action, dan route handler admin, bukan hanya di `proxy.ts`.

## 9. Authorization

Lapisan izin ada di `src/lib/permissions/`:

| File          | Isi                                                                                                                                                                                                                                                                                                                      | Akses DB |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `types.ts`    | `Actor`, `AthleteRef`, `CompetitionRef`, `Decision`                                                                                                                                                                                                                                                                      | -        |
| `policies.ts` | Kebijakan murni: `canViewAthlete`, `canManageAthletePerformance`, `canEditTimeTrial`, `canEditEvaluation`, `canManageUsers`, `canManageTrainingGroup`, `canCreateCompetition`, `canManageCompetition`, `canViewCompetition`, `isRegistrationOpen`, `canRegisterAthlete`, `canViewRegistration`, `canExportRegistrations` | Tidak    |
| `scopes.ts`   | `athleteScope(actor)`: filter Prisma untuk semua query daftar data atlet                                                                                                                                                                                                                                                 | Tidak    |
| `actor.ts`    | `requireActor(...roles)`: session → `Actor` (+ ID profil atlet/pelatih); admin tanpa MFA diarahkan ke setup                                                                                                                                                                                                              | Ya       |
| `guards.ts`   | Ownership guard: `requireAthleteAccess`, `requireTimeTrialEditAccess` (ambil fakta dari DB, lempar `AppError`)                                                                                                                                                                                                           | Ya       |

Pola pemakaian di Server Action / service:

```ts
const actor = await requireActor(); // 1. login, role, MFA admin
await requireAthleteAccess(actor, athleteId, "manage"); // 2. ownership single resource
const rows = await prisma.timeTrial.findMany({
  // 3. list: selalu pakai scope
  where: { athlete: athleteScope(actor) },
});
```

Aturan inti:

- Atlet binaan coach = atlet di `TrainingGroup` dengan `coachId` = profil coach tersebut. Coach tanpa profil aktif tidak punya atlet binaan.
- Atlet tidak pernah boleh mengubah data performanya sendiri; hanya admin dan coach pembina.
- `canRegisterAthlete` mengembalikan `Decision` dengan alasan (`FORBIDDEN`, `ATHLETE_INACTIVE`, `COMPETITION_NOT_OPEN`, `REGISTRATION_CLOSED`). Atlet/coach hanya saat event `UPCOMING` dan dalam periode pendaftaran; admin juga setelah deadline dan saat `ONGOING`. Izin dicek sebelum status atlet agar tidak membocorkan info atlet lain.
- Event: admin dan coach boleh membuat; coach hanya mengelola event buatannya; event `DRAFT` hanya terlihat oleh pengelolanya.
- Export rekap pendaftar: hanya admin.
- Error memakai `AppError` (`src/lib/errors.ts`) dan bentuk respons `ActionResult` (`ok` / `fail`).

Permission tidak boleh hanya berdasarkan route. Semua kebijakan diuji di `policies.test.ts` dan `scopes.test.ts` (`pnpm test`).

## 10. Personal Best Logic

Saat hasil baru dibuat:

1. Ambil PB lama berdasarkan athlete + event type.
2. Bandingkan duration milliseconds.
3. Jika belum ada PB -> create.
4. Jika hasil baru lebih cepat -> update.
5. Simpan referensi sumber hasil.

## 11. Time Storage

Semua race/time trial time disimpan sebagai integer milliseconds.

Contoh:
`58.27 seconds -> 58270 milliseconds`

Keuntungan:

- Mudah dibandingkan.
- Tidak tergantung format string.
- Mudah dihitung.

## 12. File Storage

Foto:

- avatar atlet.
- avatar pelatih.
- gallery.

Dokumen:

- PDF event (technical handbook / undangan).

Simpan object key/URL di database.
File binary jangan disimpan dalam PostgreSQL.

Bucket:

- `public-media`: foto publik (gallery, coach) yang memang boleh dilihat tanpa login.
- `private-docs`: PDF event dan avatar atlet. Diakses lewat signed URL berumur pendek (mis. 5 menit) yang dibuat server setelah cek permission.

File export Excel/PDF dibuat on-the-fly saat diminta dan di-stream ke browser, **tidak** disimpan di storage.

## 13. Caching

MVP:

- Gunakan Next.js caching hanya untuk data publik yang aman.
- Dashboard sensitif harus selalu mematuhi session.
- Hindari cache lintas-user.
- Response export dan signed URL wajib `Cache-Control: no-store`.

## 14. Logging

Log:

- authentication failure.
- authorization failure.
- critical mutation.
- unexpected error.

Jangan log:

- password.
- token.
- secret.
- sensitive personal data berlebihan.

## 15. Error Handling

Kategori:

- VALIDATION_ERROR.
- UNAUTHORIZED.
- FORBIDDEN.
- NOT_FOUND.
- CONFLICT.
- INTERNAL_ERROR.

## 16. Scalability

Tahap MVP:

```text
Next.js + PostgreSQL
```

Tahap berkembang:

```text
CDN
 |
Next.js
 |
PostgreSQL
 |
Redis
 |
Object Storage
```

Microservices hanya dipertimbangkan jika ada kebutuhan nyata.

## 17. Deployment

Production:

- Frontend/backend: Vercel.
- Database: Supabase PostgreSQL / Neon / managed PostgreSQL.
- Storage: Supabase Storage / Cloudinary.

Environment:

- development.
- staging.
- production.

## 18. Backup

Database production harus:

- Automated backup.
- Point-in-time recovery jika tersedia.
- Recovery procedure terdokumentasi.

## 19. Observability

Minimum:

- Error monitoring.
- Application logs.
- DB monitoring.
- Uptime monitoring.

## 20. Architecture Decision

Untuk MVP, prioritaskan:

- Simplicity.
- Security.
- Maintainability.
- Fast iteration.

Hindari premature optimization.
