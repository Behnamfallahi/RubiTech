/*
  Warnings:

  - You are about to drop the column `donationId` on the `Laptop` table. All the data in the column will be lost.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "public"."Laptop" DROP CONSTRAINT "Laptop_donationId_fkey";

-- DropIndex
DROP INDEX "public"."Laptop_donationId_key";

-- AlterTable
ALTER TABLE "public"."Laptop" DROP COLUMN "donationId";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "status",
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "public"."Donation" ADD CONSTRAINT "Donation_laptopId_fkey" FOREIGN KEY ("laptopId") REFERENCES "public"."Laptop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
