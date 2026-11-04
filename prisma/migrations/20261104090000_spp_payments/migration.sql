-- CreateEnum
CREATE TYPE "SppPaymentStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SppPaymentMethod" AS ENUM ('CASH', 'TRANSFER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SPP_SUBMITTED';

-- CreateTable
CREATE TABLE "spp_rate" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "effectiveMonth" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spp_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spp_payment" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SppPaymentStatus" NOT NULL,
    "method" "SppPaymentMethod" NOT NULL,
    "paidOn" DATE NOT NULL,
    "note" TEXT,
    "proofKey" TEXT,
    "proofName" TEXT,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spp_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spp_rate_effectiveMonth_key" ON "spp_rate"("effectiveMonth");

-- CreateIndex
CREATE INDEX "spp_rate_createdById_idx" ON "spp_rate"("createdById");

-- CreateIndex
CREATE INDEX "spp_payment_period_status_idx" ON "spp_payment"("period", "status");

-- CreateIndex
CREATE INDEX "spp_payment_submittedById_idx" ON "spp_payment"("submittedById");

-- CreateIndex
CREATE INDEX "spp_payment_reviewedById_idx" ON "spp_payment"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "spp_payment_athleteId_period_key" ON "spp_payment"("athleteId", "period");

-- AddForeignKey
ALTER TABLE "spp_rate" ADD CONSTRAINT "spp_rate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spp_payment" ADD CONSTRAINT "spp_payment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spp_payment" ADD CONSTRAINT "spp_payment_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spp_payment" ADD CONSTRAINT "spp_payment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CHECK constraints (tidak bisa dideklarasikan di schema.prisma).
ALTER TABLE "spp_rate"
  ADD CONSTRAINT "spp_rate_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "spp_rate_month_first_day" CHECK (EXTRACT(DAY FROM "effectiveMonth") = 1);

ALTER TABLE "spp_payment"
  ADD CONSTRAINT "spp_payment_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "spp_payment_period_first_day" CHECK (EXTRACT(DAY FROM "period") = 1);
