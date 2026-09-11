import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import type {
  DriverDirectoryFilters,
  DriverDirectoryResult,
  DriverRow,
} from "@/features/drivers/types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function toLastActivity(epochMs: number | null | undefined): string | null {
  return epochMs ? new Date(epochMs).toISOString() : null;
}

/**
 * `stats` are always computed over every DRIVER-role row regardless of
 * `filters` (FR-006); only the returned `drivers` list is narrowed. Roster
 * scale is one company's drivers (tens, not thousands), so a single fetch
 * filtered in-memory is simpler than pushing status/search into the query.
 */
export async function getDriverDirectory(
  filters: DriverDirectoryFilters = {},
): Promise<DriverDirectoryResult> {
  const drivers = await prisma.driver.findMany({
    where: { user: { role: "DRIVER" } },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const stats = {
    totalDrivers: drivers.length,
    activeToday: drivers.filter((driver) => driver.status === "ACTIVE").length,
    onLeave: drivers.filter((driver) => driver.status === "ON_LEAVE").length,
  };

  const searchTerm = filters.search?.trim().toLowerCase();
  const filtered = drivers.filter((driver) => {
    if (filters.status && driver.status !== filters.status) {
      return false;
    }
    if (searchTerm && !driver.user.name.toLowerCase().includes(searchTerm)) {
      return false;
    }
    return true;
  });

  const lastSignInByClerkId = new Map<string, number | null>();
  if (filtered.length > 0) {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      userId: filtered.map((driver) => driver.user.clerkUserId),
      limit: filtered.length,
    });
    for (const user of data) {
      lastSignInByClerkId.set(user.id, user.lastSignInAt);
    }
  }

  const rows: DriverRow[] = filtered.map((driver) => ({
    id: driver.id,
    name: driver.user.name,
    initials: getInitials(driver.user.name),
    email: driver.user.email ?? "",
    phone: driver.phone,
    driverClass: driver.roleType,
    truckNumber: driver.truckNumber,
    status: driver.status,
    lastActivity: toLastActivity(lastSignInByClerkId.get(driver.user.clerkUserId)),
  }));

  return { stats, drivers: rows };
}
