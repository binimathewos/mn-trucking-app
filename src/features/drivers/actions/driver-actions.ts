"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { resolveAdminOnlyAccess } from "@/lib/auth/route-access";
import { prisma } from "@/lib/db/prisma";
import { assertTruckAvailable } from "@/features/drivers/lib/truck-assignment";
import { applyDeactivation, applyReactivation } from "@/features/drivers/lib/status-transition";
import { provisionDriverAccount } from "@/features/drivers/lib/provision-account";
import {
  addDriverInputSchema,
  setDriverStatusInputSchema,
  updateDriverInputSchema,
} from "@/features/drivers/lib/validation";
import { DriverActionError } from "@/features/drivers/types";

/** Re-checks authorization independently of the `(restricted)` route layout (defense in depth). */
export async function assertAdminAccess(): Promise<void> {
  const { isSignedIn, role } = await getSessionAccess();
  const access = resolveAdminOnlyAccess({ isSignedIn, role });

  if (access.outcome !== "render") {
    throw new Error("Not authorized to manage drivers.");
  }
}

function fieldErrorsFromZod(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function addDriverAction(input: unknown): Promise<{ driverId: string }> {
  await assertAdminAccess();

  const parsed = addDriverInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new DriverActionError("Check the form for errors.", fieldErrorsFromZod(parsed.error));
  }
  const { fullName, email, temporaryPassword, phone, driverClass, truckNumber } = parsed.data;

  if (truckNumber) {
    await assertTruckAvailable(truckNumber);
  }

  const { clerkUserId } = await provisionDriverAccount({
    email,
    password: temporaryPassword,
    name: fullName,
  });

  try {
    const driver = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { clerkUserId, name: fullName, email, role: "DRIVER" },
      });
      return tx.driver.create({
        data: {
          userId: user.id,
          roleType: driverClass ?? "",
          phone: phone ?? null,
          truckNumber: truckNumber ?? null,
          status: "ACTIVE",
        },
      });
    });

    revalidatePath("/drivers");
    return { driverId: driver.id };
  } catch (error) {
    const client = await clerkClient();
    try {
      await client.users.deleteUser(clerkUserId);
    } catch (cleanupError) {
      console.error(
        `Failed to clean up orphaned Clerk user ${clerkUserId} after driver creation failure. Manual cleanup needed.`,
        cleanupError,
      );
      throw new DriverActionError(
        "The account was created but the driver profile could not be saved, and automatic cleanup failed. Manual cleanup is needed.",
      );
    }

    console.error("Driver creation failed after account provisioning; compensating account deleted.", error);
    throw new DriverActionError("Could not save the driver profile. Please try again.");
  }
}

export async function updateDriverAction(input: unknown): Promise<void> {
  await assertAdminAccess();

  const parsed = updateDriverInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new DriverActionError("Check the form for errors.", fieldErrorsFromZod(parsed.error));
  }
  const { driverId, fullName, phone, driverClass, truckNumber, status } = parsed.data;

  const existing = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: true },
  });
  if (!existing) {
    throw new DriverActionError("This driver no longer exists.");
  }

  if (truckNumber && truckNumber !== existing.truckNumber) {
    await assertTruckAvailable(truckNumber, driverId);
  }

  const becomingInactive = status === "INACTIVE" && existing.status !== "INACTIVE";
  const becomingActive = status !== "INACTIVE" && existing.status === "INACTIVE";

  await prisma.$transaction([
    prisma.user.update({ where: { id: existing.userId }, data: { name: fullName } }),
    prisma.driver.update({
      where: { id: driverId },
      data: {
        roleType: driverClass ?? "",
        phone: phone ?? null,
        truckNumber: becomingInactive ? null : (truckNumber ?? null),
        status,
      },
    }),
  ]);

  const client = await clerkClient();
  if (becomingInactive) {
    await client.users.banUser(existing.user.clerkUserId);
  } else if (becomingActive) {
    await client.users.unbanUser(existing.user.clerkUserId);
  }

  revalidatePath("/drivers");
}

export async function setDriverStatusAction(input: unknown): Promise<void> {
  await assertAdminAccess();

  const parsed = setDriverStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new DriverActionError("Invalid status change request.");
  }
  const { driverId, status } = parsed.data;

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: true },
  });
  if (!driver) {
    throw new DriverActionError("This driver no longer exists.");
  }

  const identity = { id: driver.id, clerkUserId: driver.user.clerkUserId };
  if (status === "INACTIVE") {
    await applyDeactivation(identity);
  } else {
    await applyReactivation(identity);
  }

  revalidatePath("/drivers");
}
