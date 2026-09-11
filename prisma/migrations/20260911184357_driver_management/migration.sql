-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "truckNumber" DROP NOT NULL;

-- CreateIndex
-- Enforces "a truck belongs to at most one non-inactive driver" at the database
-- layer (data-model.md "Migration considerations"); the application-level check
-- in assertTruckAvailable exists separately for a good error message.
CREATE UNIQUE INDEX "Driver_truckNumber_active_key" ON "Driver" ("truckNumber") WHERE "truckNumber" IS NOT NULL AND "status" <> 'INACTIVE';
