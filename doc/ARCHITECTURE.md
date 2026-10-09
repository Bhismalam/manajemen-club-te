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
- `/admin/athletes`
- `/admin/coaches`
- `/admin/training`
- `/admin/competitions`
- `/admin/competitions/[id]` (detail, nomor lomba, PDF, periode pendaftaran)
- `/admin/competitions/[id]/registrations` (rekap pendaftar + download)
- `/admin/users`

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
- `passkey`: Phase 2.

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

Gunakan policy/permission layer.

Contoh:

```text
canViewAthlete(currentUser, athleteId)
canEditTimeTrial(currentUser, timeTrialId)
canManageUsers(currentUser)
canRegisterAthlete(currentUser, athleteId, competition)
canViewRegistrations(currentUser, competitionId)
canExportRegistrations(currentUser)
```

Aturan pendaftaran event:

- `canRegisterAthlete`: ATHLETE hanya untuk dirinya sendiri; COACH hanya untuk atlet di training group miliknya; ADMIN untuk semua atlet. Setelah deadline, hanya ADMIN.
- `canViewRegistrations`: ADMIN semua; COACH hanya registration atlet binaannya; ATHLETE hanya miliknya.
- `canExportRegistrations`: hanya ADMIN.

Permission tidak boleh hanya berdasarkan route.

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
