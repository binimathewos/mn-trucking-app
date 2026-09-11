"use server";

import { revalidatePath } from "next/cache";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { resolveAdminOnlyAccess } from "@/lib/auth/route-access";
import { prisma } from "@/lib/db/prisma";
import { findConflictingRoute } from "@/features/routes/lib/driver-conflict";
import { autoStatusForDriverPresence, isFinalStatus } from "@/features/routes/lib/route-status";
import {
  assignDriverInputSchema,
  createRouteInputSchema,
  setRouteStatusInputSchema,
  updateRouteInputSchema,
} from "@/features/routes/lib/validation";
import { RouteActionError } from "@/features/routes/types";
import type { RouteStatus } from "@/features/routes/types";

/** Re-checks authorization independently of the UI (defense in depth). */
export async function assertAdminAccess(): Promise<void> {
  const { isSignedIn, role } = await getSessionAccess();
  const access = resolveAdminOnlyAccess({ isSignedIn, role });

  if (access.outcome !== "render") {
    throw new Error("Not authorized to manage routes.");
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

async function loadMutableRoute(routeId: string) {
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) {
    throw new RouteActionError("This route no longer exists.");
  }
  if (isFinalStatus(route.status)) {
    throw new RouteActionError("This route is already completed or cancelled and can't be changed.");
  }
  return route;
}

async function assertClientActive(clientId: string): Promise<void> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.status !== "ACTIVE") {
    throw new RouteActionError("Check the form for errors.", {
      clientId: "Select an active client.",
    });
  }
}

export async function createRouteAction(input: unknown): Promise<{ routeId: string }> {
  await assertAdminAccess();

  const parsed = createRouteInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new RouteActionError("Check the form for errors.", fieldErrorsFromZod(parsed.error));
  }
  const { clientId, pickupAddress, deliveryAddress, pickupAt, deliveryAt, driverId, referenceNumber, notes } =
    parsed.data;

  await assertClientActive(clientId);

  const pickupDate = new Date(pickupAt);
  const deliveryDate = deliveryAt ? new Date(deliveryAt) : null;

  if (driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver || driver.status !== "ACTIVE") {
      throw new RouteActionError("Check the form for errors.", {
        driverId: "Select an active driver.",
      });
    }

    const conflict = await findConflictingRoute(driverId, {
      pickupAt: pickupDate,
      deliveryAt: deliveryDate,
    });
    if (conflict) {
      throw new RouteActionError(
        `This driver is already assigned to ${conflict.routeNumber}, which overlaps this window.`,
      );
    }
  }

  const route = await prisma.route.create({
    data: {
      clientId,
      driverId: driverId ?? null,
      pickupAddress,
      deliveryAddress,
      pickupAt: pickupDate,
      deliveryAt: deliveryDate,
      referenceNumber: referenceNumber ?? null,
      notes: notes ?? null,
      status: autoStatusForDriverPresence(Boolean(driverId)),
    },
  });

  revalidatePath("/routes");
  return { routeId: route.id };
}

export async function updateRouteAction(input: unknown): Promise<void> {
  await assertAdminAccess();

  const parsed = updateRouteInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new RouteActionError("Check the form for errors.", fieldErrorsFromZod(parsed.error));
  }
  const { routeId, clientId, pickupAddress, deliveryAddress, pickupAt, deliveryAt, referenceNumber, notes } =
    parsed.data;

  await loadMutableRoute(routeId);
  await assertClientActive(clientId);

  await prisma.route.update({
    where: { id: routeId },
    data: {
      clientId,
      pickupAddress,
      deliveryAddress,
      pickupAt: new Date(pickupAt),
      deliveryAt: deliveryAt ? new Date(deliveryAt) : null,
      referenceNumber: referenceNumber ?? null,
      notes: notes ?? null,
    },
  });

  revalidatePath("/routes");
}

export async function assignDriverAction(input: unknown): Promise<void> {
  await assertAdminAccess();

  const parsed = assignDriverInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new RouteActionError("Check the form for errors.", fieldErrorsFromZod(parsed.error));
  }
  const { routeId, driverId } = parsed.data;

  const route = await loadMutableRoute(routeId);

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver || driver.status !== "ACTIVE") {
    throw new RouteActionError("Check the form for errors.", {
      driverId: "Select an active driver.",
    });
  }

  const conflict = await findConflictingRoute(
    driverId,
    { pickupAt: route.pickupAt, deliveryAt: route.deliveryAt },
    routeId,
  );
  if (conflict) {
    throw new RouteActionError(
      `This driver is already assigned to ${conflict.routeNumber}, which overlaps this window.`,
    );
  }

  await prisma.route.update({
    where: { id: routeId },
    data: { driverId, status: autoStatusForDriverPresence(true) },
  });

  revalidatePath("/routes");
}

export async function unassignDriverAction(input: { routeId: string }): Promise<void> {
  await assertAdminAccess();

  const routeId = typeof input?.routeId === "string" ? input.routeId : "";
  if (!routeId) {
    throw new RouteActionError("Invalid request.");
  }

  await loadMutableRoute(routeId);

  await prisma.route.update({
    where: { id: routeId },
    data: { driverId: null, status: autoStatusForDriverPresence(false) },
  });

  revalidatePath("/routes");
}

export async function setRouteStatusAction(input: unknown): Promise<void> {
  await assertAdminAccess();

  const parsed = setRouteStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new RouteActionError("Invalid status change request.");
  }
  const { routeId, status } = parsed.data;

  await loadMutableRoute(routeId);

  await prisma.route.update({
    where: { id: routeId },
    data: { status: status as RouteStatus },
  });

  revalidatePath("/routes");
}

export async function cancelRouteAction(input: { routeId: string }): Promise<void> {
  await assertAdminAccess();

  const routeId = typeof input?.routeId === "string" ? input.routeId : "";
  if (!routeId) {
    throw new RouteActionError("Invalid request.");
  }

  await loadMutableRoute(routeId);

  await prisma.route.update({
    where: { id: routeId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/routes");
}
