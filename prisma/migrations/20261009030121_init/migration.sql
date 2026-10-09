-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COACH', 'ATHLETE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'SICK', 'PERMISSION');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('SWIMMING', 'FINSWIMMING');

-- CreateEnum
CREATE TYPE "PersonalBestSource" AS ENUM ('TIME_TRIAL', 'COMPETITION');

-- CreateEnum
CREATE TYPE "CompetitionLevel" AS ENUM ('CLUB', 'REGIONAL', 'PROVINCIAL', 'NATIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Medal" AS ENUM ('GOLD', 'SILVER', 'BRONZE', 'NONE');

-- CreateEnum
CREATE TYPE "Round" AS ENUM ('HEAT', 'SEMIFINAL', 'FINAL', 'TIME_FINAL');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('FINISHED', 'DNS', 'DNF', 'DSQ');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REGISTRATION_CREATED', 'REGISTRATION_UPDATED', 'REGISTRATION_CANCELLED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ATHLETE',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "two_factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "athleteNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photoKey" TEXT,
    "birthDate" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" TEXT,
    "joinDate" DATE NOT NULL,
    "trainingGroupId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photoKey" TEXT,
    "phone" TEXT,
    "specialization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_session" (
    "id" TEXT NOT NULL,
    "trainingGroupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discipline" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportType" "SportType" NOT NULL,
    "distanceMeter" INTEGER NOT NULL,
    "style" TEXT NOT NULL,
    "poolLength" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_trial" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "trainingSessionId" TEXT,
    "durationMs" INTEGER NOT NULL,
    "trialDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_best" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "sourceType" "PersonalBestSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_best_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_evaluation" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "evaluationDate" DATE NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "level" "CompetitionLevel" NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "maxEntriesPerAthlete" INTEGER,
    "attachmentKey" TEXT,
    "attachmentName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_discipline" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_registration" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "registeredByUserId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "note" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_entry" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "seedTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_result" (
    "id" TEXT NOT NULL,
    "competitionEntryId" TEXT NOT NULL,
    "durationMs" INTEGER,
    "rank" INTEGER,
    "medal" "Medal" NOT NULL DEFAULT 'NONE',
    "round" "Round" NOT NULL DEFAULT 'TIME_FINAL',
    "status" "ResultStatus" NOT NULL DEFAULT 'FINISHED',
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "linkUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "two_factor_secret_idx" ON "two_factor"("secret");

-- CreateIndex
CREATE INDEX "two_factor_userId_idx" ON "two_factor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_profile_userId_key" ON "athlete_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_profile_athleteNumber_key" ON "athlete_profile"("athleteNumber");

-- CreateIndex
CREATE INDEX "athlete_profile_trainingGroupId_idx" ON "athlete_profile"("trainingGroupId");

-- CreateIndex
CREATE INDEX "athlete_profile_fullName_idx" ON "athlete_profile"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "coach_profile_userId_key" ON "coach_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "training_group_name_key" ON "training_group"("name");

-- CreateIndex
CREATE INDEX "training_group_coachId_idx" ON "training_group"("coachId");

-- CreateIndex
CREATE INDEX "training_session_trainingGroupId_startsAt_idx" ON "training_session"("trainingGroupId", "startsAt");

-- CreateIndex
CREATE INDEX "training_session_startsAt_idx" ON "training_session"("startsAt");

-- CreateIndex
CREATE INDEX "attendance_athleteId_idx" ON "attendance"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_trainingSessionId_athleteId_key" ON "attendance"("trainingSessionId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "discipline_code_key" ON "discipline"("code");

-- CreateIndex
CREATE INDEX "time_trial_athleteId_disciplineId_idx" ON "time_trial"("athleteId", "disciplineId");

-- CreateIndex
CREATE INDEX "time_trial_disciplineId_idx" ON "time_trial"("disciplineId");

-- CreateIndex
CREATE INDEX "time_trial_trainingSessionId_idx" ON "time_trial"("trainingSessionId");

-- CreateIndex
CREATE INDEX "personal_best_disciplineId_idx" ON "personal_best"("disciplineId");

-- CreateIndex
CREATE UNIQUE INDEX "personal_best_athleteId_disciplineId_key" ON "personal_best"("athleteId", "disciplineId");

-- CreateIndex
CREATE INDEX "coach_evaluation_athleteId_evaluationDate_idx" ON "coach_evaluation"("athleteId", "evaluationDate");

-- CreateIndex
CREATE INDEX "coach_evaluation_coachId_idx" ON "coach_evaluation"("coachId");

-- CreateIndex
CREATE INDEX "competition_startDate_idx" ON "competition"("startDate");

-- CreateIndex
CREATE INDEX "competition_status_registrationClosesAt_idx" ON "competition"("status", "registrationClosesAt");

-- CreateIndex
CREATE INDEX "competition_discipline_disciplineId_idx" ON "competition_discipline"("disciplineId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_discipline_competitionId_disciplineId_key" ON "competition_discipline"("competitionId", "disciplineId");

-- CreateIndex
CREATE INDEX "competition_registration_athleteId_idx" ON "competition_registration"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_registration_competitionId_athleteId_key" ON "competition_registration"("competitionId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_registration_id_competitionId_athleteId_key" ON "competition_registration"("id", "competitionId", "athleteId");

-- CreateIndex
CREATE INDEX "competition_entry_registrationId_idx" ON "competition_entry"("registrationId");

-- CreateIndex
CREATE INDEX "competition_entry_athleteId_idx" ON "competition_entry"("athleteId");

-- CreateIndex
CREATE INDEX "competition_entry_disciplineId_idx" ON "competition_entry"("disciplineId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_entry_competitionId_athleteId_disciplineId_key" ON "competition_entry"("competitionId", "athleteId", "disciplineId");

-- CreateIndex
CREATE UNIQUE INDEX "race_result_competitionEntryId_round_key" ON "race_result"("competitionEntryId", "round");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_idx" ON "audit_log"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_profile" ADD CONSTRAINT "athlete_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_profile" ADD CONSTRAINT "athlete_profile_trainingGroupId_fkey" FOREIGN KEY ("trainingGroupId") REFERENCES "training_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_profile" ADD CONSTRAINT "coach_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_group" ADD CONSTRAINT "training_group_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_trainingGroupId_fkey" FOREIGN KEY ("trainingGroupId") REFERENCES "training_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_trial" ADD CONSTRAINT "time_trial_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_trial" ADD CONSTRAINT "time_trial_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_trial" ADD CONSTRAINT "time_trial_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_trial" ADD CONSTRAINT "time_trial_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_best" ADD CONSTRAINT "personal_best_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_best" ADD CONSTRAINT "personal_best_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_evaluation" ADD CONSTRAINT "coach_evaluation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_evaluation" ADD CONSTRAINT "coach_evaluation_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition" ADD CONSTRAINT "competition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_discipline" ADD CONSTRAINT "competition_discipline_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_discipline" ADD CONSTRAINT "competition_discipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_registration" ADD CONSTRAINT "competition_registration_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_registration" ADD CONSTRAINT "competition_registration_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_registration" ADD CONSTRAINT "competition_registration_registeredByUserId_fkey" FOREIGN KEY ("registeredByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_registration" ADD CONSTRAINT "competition_registration_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_entry" ADD CONSTRAINT "competition_entry_registrationId_competitionId_athleteId_fkey" FOREIGN KEY ("registrationId", "competitionId", "athleteId") REFERENCES "competition_registration"("id", "competitionId", "athleteId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_entry" ADD CONSTRAINT "competition_entry_competitionId_disciplineId_fkey" FOREIGN KEY ("competitionId", "disciplineId") REFERENCES "competition_discipline"("competitionId", "disciplineId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_entry" ADD CONSTRAINT "competition_entry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_entry" ADD CONSTRAINT "competition_entry_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_result" ADD CONSTRAINT "race_result_competitionEntryId_fkey" FOREIGN KEY ("competitionEntryId") REFERENCES "competition_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_result" ADD CONSTRAINT "race_result_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- CHECK constraints (tidak bisa dideklarasikan di schema.prisma).
-- Lihat doc/DATABASE.md §6.
-- ============================================================================

ALTER TABLE "discipline"
  ADD CONSTRAINT "discipline_distance_positive" CHECK ("distanceMeter" > 0),
  ADD CONSTRAINT "discipline_pool_length_valid" CHECK ("poolLength" IN (25, 50));

ALTER TABLE "time_trial"
  ADD CONSTRAINT "time_trial_duration_positive" CHECK ("durationMs" > 0);

ALTER TABLE "personal_best"
  ADD CONSTRAINT "personal_best_duration_positive" CHECK ("durationMs" > 0);

ALTER TABLE "training_session"
  ADD CONSTRAINT "training_session_time_order" CHECK ("endsAt" > "startsAt");

ALTER TABLE "competition"
  ADD CONSTRAINT "competition_date_order" CHECK ("endDate" >= "startDate"),
  ADD CONSTRAINT "competition_registration_window_order" CHECK (
    "registrationOpensAt" IS NULL
    OR "registrationClosesAt" IS NULL
    OR "registrationClosesAt" > "registrationOpensAt"
  ),
  ADD CONSTRAINT "competition_registration_closes_before_start" CHECK (
    "registrationClosesAt" IS NULL OR "registrationClosesAt"::date <= "startDate"
  ),
  ADD CONSTRAINT "competition_max_entries_positive" CHECK (
    "maxEntriesPerAthlete" IS NULL OR "maxEntriesPerAthlete" > 0
  ),
  -- Event yang dipublikasikan wajib punya periode pendaftaran.
  ADD CONSTRAINT "competition_published_has_registration_window" CHECK (
    "status" = 'DRAFT'
    OR ("registrationOpensAt" IS NOT NULL AND "registrationClosesAt" IS NOT NULL)
  );

ALTER TABLE "competition_entry"
  ADD CONSTRAINT "competition_entry_seed_time_positive" CHECK (
    "seedTimeMs" IS NULL OR "seedTimeMs" > 0
  );

ALTER TABLE "race_result"
  ADD CONSTRAINT "race_result_rank_positive" CHECK ("rank" IS NULL OR "rank" > 0),
  ADD CONSTRAINT "race_result_finished_has_duration" CHECK (
    "status" <> 'FINISHED' OR ("durationMs" IS NOT NULL AND "durationMs" > 0)
  ),
  ADD CONSTRAINT "race_result_duration_positive" CHECK ("durationMs" IS NULL OR "durationMs" > 0);

ALTER TABLE "competition_registration"
  ADD CONSTRAINT "competition_registration_cancel_consistent" CHECK (
    ("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL)
  );
