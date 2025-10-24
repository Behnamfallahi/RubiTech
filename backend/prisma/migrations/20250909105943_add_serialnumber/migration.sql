/*
  Warnings:

  - A unique constraint covering the columns `[serialNumber]` on the table `Laptop` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Laptop" ALTER COLUMN "model" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Laptop_serialNumber_key" ON "public"."Laptop"("serialNumber");
