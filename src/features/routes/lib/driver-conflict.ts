import { prisma } from "@/lib/db/prisma";
import { formatRouteNumber } from "@/features/routes/lib/route-number";
import type { RouteRow } from "@/features/routes/types";

/**
 * Flags an overlapping non-final route already assigned to `driverId`
 * (research.md #4, FR-019). Only compares against the driver's other routes
 * that have `deliveryAt` set, and only when `candidate.deliveryAt` is also
 * set — per the Clarifications session, a missing delivery time on either
 * side skips the check entirely rather than falling back to a heuristic.
 */
export async function findConflictingRoute(
  driverId: string,
  candidate: { pickupAt: Date; deliveryAt: Date | null },
  excludeRouteId?: string,
): Promise<RouteRow | null> {
  if (!candidate.deliveryAt) {
    return null;
  }

  const existingRoutes = await prisma.route.findMany({
    where: {
      driverId,
      id: excludeRouteId ? { not: excludeRouteId } : undefined,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      deliveryAt: { not: null },
    },
    include: { client: true, driver: { include: { user: true } } },
  });

  const conflict = existingRoutes.find(
    (existing) =>
      existing.deliveryAt !== null &&
      existing.pickupAt < candidate.deliveryAt! &&
      candidate.pickupAt < existing.deliveryAt,
  );

  if (!conflict) {
    return null;
  }

  return {
    id: conflict.id,
    routeNumber: formatRouteNumber(conflict.sequenceNumber),
    clientId: conflict.clientId,
    clientName: conflict.client.companyName,
    driverId: conflict.driverId,
    pickupAddress: conflict.pickupAddress,
    deliveryAddress: conflict.deliveryAddress,
    pickupAt: conflict.pickupAt.toISOString(),
    deliveryAt: conflict.deliveryAt ? conflict.deliveryAt.toISOString() : null,
    driverName: conflict.driver?.user.name ?? null,
    truckNumber: conflict.driver?.truckNumber ?? null,
    referenceNumber: conflict.referenceNumber,
    notes: conflict.notes,
    status: conflict.status,
    hourlyRate: conflict.hourlyRate.toFixed(2),
  };
}
