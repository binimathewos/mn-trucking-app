import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

interface DriverIdentity {
  id: string;
  clerkUserId: string;
}

/**
 * Sets the driver inactive, frees any assigned truck (FR-024), and bans the
 * Clerk account so all sessions are revoked and the driver can no longer sign
 * in (FR-023) — research.md #6 centralizes access revocation at the session
 * layer instead of adding a local "is this driver banned" check to every route.
 */
export async function applyDeactivation(driver: DriverIdentity): Promise<void> {
  await prisma.driver.update({
    where: { id: driver.id },
    data: { status: "INACTIVE", truckNumber: null },
  });

  const client = await clerkClient();
  await client.users.banUser(driver.clerkUserId);
}

/**
 * Restores active status and unbans the Clerk account (FR-025). Truck
 * assignment is left as-is (already cleared by deactivation) — the
 * administrator re-assigns one afterward if needed, since it may have been
 * given to someone else in the meantime.
 */
export async function applyReactivation(driver: DriverIdentity): Promise<void> {
  await prisma.driver.update({
    where: { id: driver.id },
    data: { status: "ACTIVE" },
  });

  const client = await clerkClient();
  await client.users.unbanUser(driver.clerkUserId);
}
