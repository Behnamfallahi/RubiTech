-- AlterTable: User - add ambassador panel fields
ALTER TABLE "public"."User" 
ADD COLUMN     "familyName" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "region" TEXT;

-- Unique index on User.nationalId (nullable unique)
CREATE UNIQUE INDEX "User_nationalId_key" ON "public"."User"("nationalId");

-- AlterTable: Student - add ambassador-related fields and relation
ALTER TABLE "public"."Student" 
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "introducedByUserId" INTEGER;

-- Unique indexes on Student
CREATE UNIQUE INDEX "Student_nationalId_key" ON "public"."Student"("nationalId");
CREATE UNIQUE INDEX "Student_phoneNumber_key" ON "public"."Student"("phoneNumber");

-- Foreign key: Student.introducedByUserId -> User.id
ALTER TABLE "public"."Student" ADD CONSTRAINT "Student_introducedByUserId_fkey" FOREIGN KEY ("introducedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


