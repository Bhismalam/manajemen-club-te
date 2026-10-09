# DATABASE.md — Database Design

## 1. Database

PostgreSQL + Prisma ORM.

## 2. ID Strategy

Gunakan CUID atau UUID untuk primary key.

## 3. Core Entities

### Auth Tables (Better Auth)

Autentikasi memakai **Better Auth** + Prisma adapter. Tabel `User`, `Session`, `Account`, `Verification`, dan `TwoFactor` digenerate oleh Better Auth CLI (`npx @better-auth/cli generate`), lalu diberi field tambahan sesuai kebutuhan aplikasi. Jangan membuat tabel auth paralel.

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
role                # additional field, default ATHLETE
status              # additional field, default ACTIVE
twoFactorEnabled    # dari plugin twoFactor
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
secret              # TOTP secret, terenkripsi
backupCodes         # recovery codes, terenkripsi
```

### AthleteProfile

```text
id
userId
athleteNumber
fullName
photoUrl
birthDate
gender
phone
joinDate
trainingGroupId
isActive
createdAt
updatedAt
```

### CoachProfile

```text
id
userId
fullName
photoUrl
phone
specialization
isActive
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
date
startTime
endTime
location
notes
createdBy
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
recordedBy
createdAt
updatedAt
```

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
style
poolLength
isActive
createdAt
updatedAt
```

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
recordedBy
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
startDate
endDate
level
status
registrationOpensAt
registrationClosesAt    # deadline pendaftaran
maxEntriesPerAthlete    # nullable, batas jumlah nomor lomba per atlet
attachmentKey           # nullable, object key PDF di storage privat
attachmentName          # nullable, nama file untuk ditampilkan
createdBy
createdAt
updatedAt
```

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

`competitionId` dan `athleteId` disimpan ulang (denormalisasi) agar unique constraint dan query rekap sederhana. Nilainya harus sama dengan registration induknya.

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
recordedBy
createdAt
updatedAt
```

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

- Email unique.
- Athlete number unique.
- Satu PB per athlete + discipline.
- Satu registration per competition + athlete.
- Satu entry per competition + athlete + discipline.
- `CompetitionEntry.disciplineId` harus ada di `CompetitionDiscipline` event yang sama (dicek di service).
- Jumlah entry aktif per atlet ≤ `Competition.maxEntriesPerAthlete` jika diisi (dicek di service).
- `registrationClosesAt` > `registrationOpensAt` dan ≤ `startDate`.
- Race result harus terkait competition entry dari registration berstatus `REGISTERED`.
- Duration harus > 0 jika status FINISHED.
- Rank harus > 0 jika tersedia.

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

## 10. Sample Prisma Direction

```prisma
enum UserRole {
  ADMIN
  COACH
  ATHLETE
}

enum SportType {
  SWIMMING
  FINSWIMMING
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum RegistrationStatus {
  REGISTERED
  CANCELLED
}

// Field inti digenerate oleh Better Auth CLI; role/status adalah additional fields.
model User {
  id               String     @id
  name             String
  email            String     @unique
  emailVerified    Boolean    @default(false)
  role             UserRole   @default(ATHLETE)
  status           UserStatus @default(ACTIVE)
  twoFactorEnabled Boolean    @default(false)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  deletedAt        DateTime?
}

model CompetitionRegistration {
  id                 String             @id @default(cuid())
  competitionId      String
  athleteId          String
  registeredByUserId String
  status             RegistrationStatus @default(REGISTERED)
  note               String?
  cancelledAt        DateTime?
  cancelledByUserId  String?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  competition Competition        @relation(fields: [competitionId], references: [id])
  athlete     AthleteProfile     @relation(fields: [athleteId], references: [id])
  entries     CompetitionEntry[]

  @@unique([competitionId, athleteId])
  @@index([athleteId])
}
```

Schema final harus dibuat melalui migration, bukan manual edit production DB.

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
