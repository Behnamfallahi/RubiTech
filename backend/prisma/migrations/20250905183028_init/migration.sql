-- CreateTable
CREATE TABLE "public"."Student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Laptop" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER,
    "laptopName" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modemSerial" TEXT,
    "hard" TEXT,
    "ram" TEXT,
    "propertyLabel" TEXT,
    "skin" TEXT,
    "shablon" TEXT,
    "mouse" TEXT,
    "backpack" TEXT,
    "batteryType" TEXT,
    "charger1" TEXT,
    "charger2" TEXT,
    "powerCable1" TEXT,
    "powerCable2" TEXT,
    "batteryStatus" TEXT,
    "keyboardLabel" TEXT,
    "reportLink" TEXT,
    "dataByDirector" TEXT,
    "trackingNumber" TEXT,
    "biosPassword" TEXT,
    "guarantee" TEXT,

    CONSTRAINT "Laptop_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Laptop" ADD CONSTRAINT "Laptop_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
