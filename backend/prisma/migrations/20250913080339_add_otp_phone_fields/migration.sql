/*
  Warnings:

  - A unique constraint covering the columns `[laptopId]` on the table `Donation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[donationId]` on the table `Laptop` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'STUDENT';

-- DropForeignKey
ALTER TABLE "public"."Contract" DROP CONSTRAINT "Contract_laptopId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Donation" DROP CONSTRAINT "Donation_laptopId_fkey";

-- AlterTable
ALTER TABLE "public"."Contract" ALTER COLUMN "laptopId" DROP NOT NULL,
ALTER COLUMN "signedAt" DROP NOT NULL,
ALTER COLUMN "signedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Laptop" ADD COLUMN     "donationId" INTEGER;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3),
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Donation_laptopId_key" ON "public"."Donation"("laptopId");

-- CreateIndex
CREATE UNIQUE INDEX "Laptop_donationId_key" ON "public"."Laptop"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "public"."User"("phoneNumber");

-- AddForeignKey
ALTER TABLE "public"."Laptop" ADD CONSTRAINT "Laptop_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "public"."Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "public"."Laptop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
