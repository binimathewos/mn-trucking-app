import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatRouteNumber } from "@/features/routes/lib/route-number";
import type { AssignedRouteOption, RouteDirectoryFilters, RouteRow } from "@/features/routes/types";
import type { SessionRole } from "@/lib/auth/route-access";

const routeWithRelations = {
  include: { client: true, driver: { include: { user: true } } },
} satisfies Prisma.RouteDefaultArgs;

type RouteWithRelations = Prisma.RouteGetPayload<typeof routeWithRelations>;

function toRouteRow(route: RouteWithRelations): RouteRow {
  return {
    id: route.id,
    routeNumber: formatRouteNumber(route.sequenceNumber),
    clientId: route.clientId,
    clientName: route.client.companyName,
    driverId: route.driverId,
    pickupAddress: route.pickupAddress,
    deliveryAddress: route.deliveryAddress,
    pickupAt: route.pickupAt.toISOString(),
    deliveryAt: route.deliveryAt ? route.deliveryAt.toISOString() : null,
    driverName: route.driver?.user.name ?? null,
    truckNumber: route.driver?.truckNumber ?? null,
    referenceNumber: route.referenceNumber,
    notes: route.notes,
    status: route.status,
    hourlyRate: route.hourlyRate.toFixed(2),
  };
}

function buildWhere(filters: RouteDirectoryFilters): Prisma.RouteWhereInput {
  const where: Prisma.RouteWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.driverId === "UNASSIGNED") {
    where.driverId = null;
  } else if (filters.driverId) {
    where.driverId = filters.driverId;
  }
  if (filters.clientId) {
    where.clientId = filters.clientId;
  }
  if (filters.pickupDateFrom || filters.pickupDateTo) {
    where.pickupAt = {
      ...(filters.pickupDateFrom ? { gte: new Date(filters.pickupDateFrom) } : {}),
      ...(filters.pickupDateTo ? { lte: new Date(filters.pickupDateTo) } : {}),
    };
  }
  return where;
}

/**
 * `search` matches the formatted route number (e.g. `RT-000042`, derived
 * from `sequenceNumber` and not a database column), client company name, and
 * reference number — applied post-fetch in-memory (route volume is one
 * company's hundreds of rows, not millions — plan.md Performance Goals) so
 * the route-number match works without a generated/computed DB column.
 */
export async function getRouteDirectory(filters: RouteDirectoryFilters = {}): Promise<RouteRow[]> {
  const routes = await prisma.route.findMany({
    where: buildWhere(filters),
    include: routeWithRelations.include,
    orderBy: { pickupAt: "desc" },
  });

  const rows = routes.map(toRouteRow);

  const term = filters.search?.trim().toLowerCase();
  if (!term) {
    return rows;
  }

  return rows.filter(
    (row) =>
      row.routeNumber.toLowerCase().includes(term) ||
      row.clientName.toLowerCase().includes(term) ||
      (row.referenceNumber?.toLowerCase().includes(term) ?? false),
  );
}

export async function getMyRoutes(driverId: string): Promise<RouteRow[]> {
  const routes = await prisma.route.findMany({
    where: { driverId },
    include: routeWithRelations.include,
    orderBy: { pickupAt: "desc" },
  });

  return routes.map(toRouteRow);
}

/** `driverId` here is a real `Driver.id` — distinct from the Timesheets feature's own `driverId`, which is really a `User.id`. */
export async function isRouteAssignedToDriver(routeId: string, driverProfileId: string): Promise<boolean> {
  const route = await prisma.route.findFirst({ where: { id: routeId, driverId: driverProfileId } });
  return route !== null;
}

/** One query, grouped by `Driver.id`. Excludes COMPLETED and CANCELLED routes — a driver only logs time against a route still in progress. */
export async function getAssignedRoutesByDriverProfileIds(
  driverProfileIds: string[],
): Promise<Record<string, AssignedRouteOption[]>> {
  const routes = await prisma.route.findMany({
    where: { driverId: { in: driverProfileIds }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    orderBy: { pickupAt: "desc" },
  });

  const result: Record<string, AssignedRouteOption[]> = {};
  for (const route of routes) {
    const driverId = route.driverId;
    if (!driverId) {
      continue;
    }
    const label = `${route.pickupAddress} → ${route.deliveryAddress}`;
    (result[driverId] ??= []).push({ id: route.id, routeNumber: formatRouteNumber(route.sequenceNumber), label });
  }
  return result;
}

export async function getRouteById(
  routeId: string,
  requester: { role: SessionRole; driverId?: string },
): Promise<RouteRow | null> {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: routeWithRelations.include,
  });

  if (!route) {
    return null;
  }

  if (requester.role !== "administrator" && route.driverId !== requester.driverId) {
    return null;
  }

  return toRouteRow(route);
}
