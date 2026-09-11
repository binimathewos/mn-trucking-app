-- CreateEnum
CREATE TYPE "NonDrivingReason" AS ENUM ('NO_JOB', 'DAY_OFF', 'OTHER');

-- CreateTable
CREATE TABLE "NonDrivingDay" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" "NonDrivingReason" NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonDrivingDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NonDrivingDay_timesheetId_date_key" ON "NonDrivingDay"("timesheetId", "date");

-- AddForeignKey
ALTER TABLE "NonDrivingDay" ADD CONSTRAINT "NonDrivingDay_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
