import { prisma } from "@/lib/db/prisma";
import { DriverActionError } from "@/features/drivers/types";

/**
 * Throws when `truckNumber` is already held by another non-INACTIVE driver
 * (case-insensitive match) — a truck belongs to at most one active driver at
 * a time (FR-021). Backed by a database partial unique index as a last-resort
 * guarantee against races (research.md #8); this check exists to surface a
 * clear, specific error before that constraint would otherwise reject the write.
 */
export async function assertTruckAvailable(
  truckNumber: string,
  excludeDriverId?: string,
): Promise<void> {
  const conflict = await prisma.driver.findFirst({
    where: {
      truckNumber: { equals: truckNumber, mode: "insensitive" },
      status: { not: "INACTIVE" },
      ...(excludeDriverId ? { id: { not: excludeDriverId } } : {}),
    },
    select: { id: true },
  });

  if (conflict) {
    throw new DriverActionError(
      `Truck ${truckNumber} is already assigned to another active driver.`,
      { truckNumber: `Truck ${truckNumber} is already assigned to another active driver.` },
    );
  }
}
