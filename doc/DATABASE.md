# DATABASE.md — Database Design

## 1. Database

PostgreSQL + Prisma ORM 7.

**Sumber kebenaran schema adalah [`prisma/schema.prisma`](../prisma/schema.prisma)** dan folder `prisma/migrations/`. Dokumen ini menjelaskan desain dan alasannya. Jika ada perbedaan, schema yang berlaku, lalu dokumen ini diperbarui.

Konvensi:

- Nama model PascalCase, nama tabel snake_case (`@@map`), nama kolom camelCase.
- Timestamp disimpan dalam UTC. Kolom tanggal saja (tanggal lahir, tanggal event) memakai `@db.Date`.
- CHECK constraint yang tidak bisa ditulis di Prisma ada di migration SQL (lihat §6).

## 2. ID Strategy

- Tabel domain: `cuid()` (default Prisma).
- Tabel auth (User, Session, Account, Verification, TwoFactor): ID dibuat oleh Better Auth.

## 3. Core Entities

### Auth Tables (Better Auth)

Autentikasi memakai **Better Auth** + Prisma adapter. Field tabel `User`, `Session`, `Account`, `Verification`, dan `TwoFactor` mengikuti output Better Auth CLI (`pnpm exec auth generate`), lalu diberi field tambahan sesuai kebutuhan aplikasi. Jangan membuat tabel auth paralel.

Cara memperbarui jika plugin auth berubah: generate ke file sementara (`--output`), bandingkan, lalu samakan field di `schema.prisma` secara manual. Jangan menimpa `schema.prisma` langsung, karena CLI menghasilkan `role` sebagai `String`, sedangkan kita memakai enum `UserRole`.

Catatan penting:

- Password hash **tidak** disimpan di `User`, melainkan di `Account.password` (provider `credential`).
- Secret TOTP dan backup codes disimpan di tabel `TwoFactor` (terenkripsi oleh Better Auth).

### User

```text
id
name
email
emailVerified
image
role                # plugin admin, enum UserRole, default ATHLETE
banned              # plugin admin
banReason           # plugin admin
banExpires          # plugin admin
twoFactorEnabled    # plugin twoFactor
status              # additional field, enum UserStatus, default ACTIVE
lastLoginAt
createdAt
updatedAt
deletedAt
```

Role:

- ADMIN
- COACH
- ATHLETE

Status:

- ACTIVE
- INACTIVE
- SUSPENDED

`status` adalah label domain yang tampil di UI admin. Pemblokiran login dilakukan oleh Better Auth lewat `banned`. Karena itu, saat admin menonaktifkan atau men-suspend user, service wajib mengubah keduanya sekaligus: `status` dan `banned = true` (lewat API plugin admin, yang juga mencabut session aktif). Saat diaktifkan kembali, `banned = false` dan `status = ACTIVE`.

### Session

```text
id
userId
token
expiresAt
ipAddress
userAgent
createdAt
updatedAt
```

### Account

```text
id
userId
providerId          # "credential" untuk email + password
accountId
password            # password hash
createdAt
updatedAt
```

### Verification

Token reset password dan verifikasi email.

```text
id
identifier
value
expiresAt
createdAt
updatedAt
```

### TwoFactor

```text
id
userId
secret                    # TOTP secret, terenkripsi
backupCodes               # recovery codes, terenkripsi
verified
failedVerificationCount   # penguncian bawaan setelah gagal berulang
lockedUntil
```

### AthleteProfile

```text
id
userId
athleteNumber
fullName
photoKey            # object key di bucket privat, bukan URL publik
birthDate           # @db.Date
gender              # enum Gender: MALE, FEMALE
phone
joinDate            # @db.Date
trainingGroupId
isActive
deletedAt
createdAt
updatedAt
```

### CoachProfile

```text
id
userId
fullName
photoKey
phone
specialization
isActive
deletedAt
createdAt
updatedAt
```

### TrainingGroup

```text
id
name
description
coachId
createdAt
updatedAt
```

### TrainingSession

```text
id
trainingGroupId
title
startsAt            # timestamp UTC (tanggal + jam mulai)
endsAt              # timestamp UTC, harus > startsAt
location
notes
createdById
createdAt
updatedAt
```

### Attendance

```text
id
trainingSessionId
athleteId
status
note
recordedById
createdAt
updatedAt
```

Unique: `trainingSessionId + athleteId`.

AttendanceStatus:

- PRESENT
- ABSENT
- SICK
- PERMISSION

### Discipline

Representasi nomor lomba.

```text
id
code
name
sportType
distanceMeter
style               # FREESTYLE, BACKSTROKE, SURFACE, BIFINS, APNEA, ...
poolLength          # 25 (short course) atau 50 (long course)
isActive
createdAt
updatedAt
```

Nomor yang sama di kolom berbeda dianggap discipline berbeda (PB-nya terpisah). Contoh code: `SW-50FR-LC`, `FS-100SF-LC`.

SportType:

- SWIMMING
- FINSWIMMING

Contoh discipline:

- 50m Freestyle.
- 100m Freestyle.
- 50m Surface.
- 100m Surface.
- 50m Apnea.

### TimeTrial

```text
id
athleteId
disciplineId
trainingSessionId
durationMs
trialDate
note
recordedById
createdAt
updatedAt
```

### PersonalBest

```text
id
athleteId
disciplineId
durationMs
achievedAt
sourceType
sourceId
createdAt
updatedAt
```

SourceType:

- TIME_TRIAL
- COMPETITION

Unique:
`athleteId + disciplineId`

### Competition

```text
id
name
description             # text, deskripsi event
location
startDate               # @db.Date
endDate                 # @db.Date
level                   # enum CompetitionLevel
status                  # default DRAFT
registrationOpensAt
registrationClosesAt    # deadline pendaftaran
maxEntriesPerAthlete    # nullable, batas jumlah nomor lomba per atlet
attachmentKey           # nullable, object key PDF di storage privat
attachmentName          # nullable, nama file untuk ditampilkan
createdById
createdAt
updatedAt
```

CompetitionLevel:

- CLUB
- REGIONAL
- PROVINCIAL
- NATIONAL
- INTERNATIONAL

CompetitionStatus:

- DRAFT
- UPCOMING
- ONGOING
- COMPLETED
- CANCELLED

Pendaftaran terbuka jika:
`status = UPCOMING` dan `registrationOpensAt <= now <= registrationClosesAt`.

### CompetitionDiscipline

Nomor lomba yang dibuka pada sebuah event.

```text
id
competitionId
disciplineId
createdAt
```

Unique:
`competitionId + disciplineId`

### CompetitionRegistration

Satu pendaftaran atlet ke satu event (header). Nomor lomba yang dipilih disimpan di `CompetitionEntry`.

```text
id
competitionId
athleteId
registeredByUserId      # atlet sendiri, pelatih, atau admin
status
note
cancelledAt
cancelledByUserId
createdAt
updatedAt
```

RegistrationStatus:

- REGISTERED
- CANCELLED

Pendaftaran langsung berstatus `REGISTERED` (tanpa approval).

Unique:
`competitionId + athleteId`

Jika atlet mendaftar ulang setelah membatalkan, baris yang sama dipakai lagi (status kembali ke `REGISTERED`), bukan membuat baris baru.

### CompetitionEntry

Satu nomor lomba yang diikuti atlet dalam sebuah event.

```text
id
registrationId
competitionId
athleteId
disciplineId
seedTimeMs              # snapshot PB saat mendaftar, nullable
createdAt
updatedAt
```

Unique:
`competitionId + athleteId + disciplineId`

`competitionId` dan `athleteId` disimpan ulang (denormalisasi) agar unique constraint dan query rekap sederhana. Konsistensinya dijamin database lewat dua composite foreign key:

- `(registrationId, competitionId, athleteId)` → `CompetitionRegistration(id, competitionId, athleteId)`: entry selalu milik event dan atlet yang sama dengan registration-nya.
- `(competitionId, disciplineId)` → `CompetitionDiscipline(competitionId, disciplineId)`: nomor lomba harus dibuka di event tersebut.

Karena kolom dipakai bersama oleh beberapa relasi, buat entry dengan scalar ID (`createMany` / unchecked input), bukan nested `connect`.

### RaceResult

```text
id
competitionEntryId
durationMs
rank
medal
round
status
note
recordedById
createdAt
updatedAt
```

Unique: `competitionEntryId + round`.

Medal:

- GOLD
- SILVER
- BRONZE
- NONE

Round:

- HEAT
- SEMIFINAL
- FINAL
- TIME_FINAL

ResultStatus:

- FINISHED
- DNS
- DNF
- DSQ

### CoachEvaluation

```text
id
athleteId
coachId
evaluationDate
strengths
weaknesses
focus
target
notes
createdAt
updatedAt
```

## 4. Supporting Tables

### Notification

Wajib di MVP karena dipakai untuk notifikasi pendaftaran event ke admin.

```text
id
userId
title
message
type
linkUrl         # nullable, contoh: /admin/competitions/{id}/registrations
readAt
createdAt
```

NotificationType (awal):

- REGISTRATION_CREATED
- REGISTRATION_UPDATED
- REGISTRATION_CANCELLED

### AuditLog

```text
id
actorUserId
action
entityType
entityId
metadata
createdAt
```

## 5. Relationships

```text
User
 ├── Session
 ├── Account
 ├── TwoFactor
 ├── AthleteProfile
 └── CoachProfile

CoachProfile
 └── TrainingGroup

TrainingGroup
 └── TrainingSession

AthleteProfile
 ├── Attendance
 ├── TimeTrial
 ├── PersonalBest
 ├── CompetitionRegistration
 ├── CompetitionEntry
 └── CoachEvaluation

Competition
 ├── CompetitionDiscipline
 └── CompetitionRegistration
       └── CompetitionEntry
             └── RaceResult

Discipline
 ├── TimeTrial
 ├── PersonalBest
 ├── CompetitionDiscipline
 └── CompetitionEntry
```

## 6. Critical Constraints

Ditegakkan oleh database (unique, foreign key, atau CHECK di migration `init`):

- Email unique.
- Athlete number unique.
- Satu PB per athlete + discipline.
- Satu registration per competition + athlete.
- Satu entry per competition + athlete + discipline.
- Satu attendance per sesi + atlet.
- Satu race result per entry + round.
- Entry harus sesuai registration-nya dan nomor lombanya harus dibuka di event tersebut (composite FK).
- `distanceMeter` > 0, `poolLength` ∈ {25, 50}.
- `durationMs` > 0 untuk time trial, PB, dan race result (jika diisi).
- Race result berstatus `FINISHED` wajib punya `durationMs`.
- `rank` > 0 jika diisi; `seedTimeMs` > 0 jika diisi; `maxEntriesPerAthlete` > 0 jika diisi.
- `endsAt` > `startsAt` (sesi latihan); `endDate` ≥ `startDate` (event).
- `registrationClosesAt` > `registrationOpensAt` dan tanggalnya ≤ `startDate`.
- Event selain `DRAFT` wajib punya periode pendaftaran.
- Registration berstatus `CANCELLED` jika dan hanya jika `cancelledAt` terisi.

Dicek di service (butuh logika atau waktu sekarang):

- Pendaftaran hanya saat event `UPCOMING` dan `now` berada di periode pendaftaran.
- Jumlah entry per atlet ≤ `Competition.maxEntriesPerAthlete`.
- Race result hanya untuk entry dari registration berstatus `REGISTERED`.

## 7. Indexes

Tambahkan index pada:

- `User.email`
- `AthleteProfile.athleteNumber`
- `Attendance.trainingSessionId`
- `Attendance.athleteId`
- `TimeTrial.athleteId`
- `TimeTrial.disciplineId`
- `PersonalBest.athleteId`
- `Competition.startDate`
- `Competition.status + registrationClosesAt`
- `CompetitionDiscipline.competitionId`
- `CompetitionRegistration.competitionId`
- `CompetitionRegistration.athleteId`
- `CompetitionEntry.competitionId`
- `CompetitionEntry.registrationId`
- `RaceResult.competitionEntryId`
- `CoachEvaluation.athleteId`
- `Session.userId`
- `Account.userId`
- `Notification.userId + readAt`

## 8. Data Type Rules

Time:

- Gunakan milliseconds integer.

Date/time:

- Simpan timestamp UTC.
- Tampilkan berdasarkan timezone user/club.

## 9. Soft Delete

Gunakan soft delete untuk:

- User.
- Athlete.
- Coach.

Jangan hard delete data performa historis tanpa proses administratif.

## 10. Prisma Schema & Workflow

Schema lengkap: [`prisma/schema.prisma`](../prisma/schema.prisma).

Alur perubahan schema:

1. Ubah `schema.prisma`.
2. `pnpm db:migrate --name <nama>`. Jika butuh SQL tambahan (CHECK, index khusus), pakai `--create-only`, edit `migration.sql`, lalu jalankan `pnpm db:migrate` lagi.
3. `pnpm db:generate` (Prisma 7 tidak lagi generate otomatis setelah migrate).

## 10.1 Seed (development)

`pnpm db:seed` (juga dijalankan otomatis oleh `pnpm db:reset`). Isinya:

- 19 discipline (renang + finswimming, kolam 50m).
- 1 admin, 2 pelatih, 4 atlet, 2 training group. Password semua akun = `SEED_PASSWORD` di `.env.local`.
- Data demo: 1 sesi latihan + absensi, time trial + PB, dan 1 event `UPCOMING` dengan 2 pendaftaran (satu didaftarkan atlet sendiri, satu oleh pelatih).

Akun seed: `admin@club.local`, `coach.rina@club.local`, `coach.dimas@club.local`, `atlet1@club.local` sampai `atlet4@club.local`.

Seed idempoten (aman dijalankan berulang) dan menolak berjalan saat `NODE_ENV=production`. Admin production dibuat terpisah di Phase 17.

Schema production harus dibuat melalui migration, bukan manual edit production DB.

## 11. Data Ownership

Atlet hanya boleh membaca:

- profile milik sendiri.
- attendance milik sendiri.
- result milik sendiri.
- PB milik sendiri.
- evaluation milik sendiri.
- registration event milik sendiri.

Atlet dapat membaca event berstatus `UPCOMING`/`ONGOING`/`COMPLETED` (bukan `DRAFT`) beserta PDF-nya.

Coach membaca sesuai assignment/permission. Untuk pendaftaran event, coach hanya membaca dan mengelola registration atlet di training group miliknya.

Admin dapat melihat seluruh data operasional.

## 12. Backup and Integrity

- Foreign key wajib.
- Migration wajib version-controlled.
- Backup production wajib.
- Restore procedure harus diuji.
