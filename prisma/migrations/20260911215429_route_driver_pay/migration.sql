-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "hourlyRate" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TimesheetEntry" ADD COLUMN     "routeId" TEXT;

-- CreateTable
CREATE TABLE "DriverPaySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultHourlyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverPaySettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
