-- AlterEnum
ALTER TYPE "public"."DonationType" ADD VALUE 'MONEY';

-- AlterTable
ALTER TABLE "public"."Donation" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "experienceField" TEXT,
ADD COLUMN     "studentId" INTEGER;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "location" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Donation" ADD CONSTRAINT "Donation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
