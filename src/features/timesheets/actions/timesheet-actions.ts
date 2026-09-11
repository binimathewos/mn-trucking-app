"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { resolveAdminOnlyAccess } from "@/lib/auth/route-access";
import { prisma } from "@/lib/db/prisma";
import { isRouteAssignedToDriver } from "@/features/routes/data/route-repository";
import { dailyEntryInputSchema, nonDrivingDayInputSchema } from "@/features/timesheets/lib/calculations";
import {
  deleteDailyEntry,
  deleteNonDrivingDay,
  deleteTimesheet,
  upsertDailyEntry,
  upsertNonDrivingDay,
} from "@/features/timesheets/data/timesheet-repository";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Re-checks authorization independently of the `(restricted)` route layout (defense in depth). */
async function assertAdminAccess(): Promise<void> {
  const { isSignedIn, role } = await getSessionAccess();
  const access = resolveAdminOnlyAccess({ isSignedIn, role });

  if (access.outcome !== "render") {
    throw new Error("Not authorized to manage timesheets.");
  }
}

const timesheetIdentifierSchema = z.object({
  driverId: z.string().min(1),
  weekStart: z.string().regex(ISO_DATE_RE),
});

const dailyEntryIdentifierSchema = timesheetIdentifierSchema.extend({
  date: z.string().regex(ISO_DATE_RE),
});

/**
 * Administrators may act on behalf of any driver; drivers may only act on
 * their own timesheet — the returned `User.id` is forced from the session,
 * never trusted from client input (FR-004, FR-019, SC-001, SC-006).
 */
async function resolveEffectiveDriverId(
  session: Pick<Awaited<ReturnType<typeof getSessionAccess>>, "role" | "user">,
  requestedDriverId: string,
): Promise<string> {
  const { role, user } = session;

  if (role === "administrator") {
    return requestedDriverId;
  }

  if (role === "driver") {
    const sessionUser = user
      ? await prisma.user.findUnique({ where: { clerkUserId: user.id }, include: { driver: true } })
      : null;
    if (!sessionUser?.driver) {
      throw new Error("Not authorized to manage timesheets.");
    }
    return sessionUser.id;
  }

  throw new Error("Not authorized to manage timesheets.");
}

/**
 * Both paths are held to the same route-assignment check regardless of who
 * is saving (FR-004, FR-019, SC-001, SC-006).
 */
export async function saveDailyEntryAction(input: unknown): Promise<void> {
  const { isSignedIn, role, user } = await getSessionAccess();
  const parsed = dailyEntryInputSchema.parse(input);

  if (!isSignedIn) {
    throw new Error("Not authorized to manage timesheets.");
  }

  const effectiveDriverId = await resolveEffectiveDriverId({ role, user }, parsed.driverId);

  const driverUser = await prisma.user.findUnique({
    where: { id: effectiveDriverId },
    include: { driver: true },
  });
  const driverProfileId = driverUser?.driver?.id;

  if (!driverProfileId || !(await isRouteAssignedToDriver(parsed.routeId, driverProfileId))) {
    throw new Error("This route isn't assigned to this driver.");
  }

  await upsertDailyEntry({ ...parsed, driverId: effectiveDriverId });
  revalidatePath("/timesheets");
}

export async function deleteDailyEntryAction(input: unknown): Promise<void> {
  await assertAdminAccess();
  const parsed = dailyEntryIdentifierSchema.parse(input);
  await deleteDailyEntry(parsed);
  revalidatePath("/timesheets");
}

export async function deleteTimesheetAction(input: unknown): Promise<void> {
  await assertAdminAccess();
  const parsed = timesheetIdentifierSchema.parse(input);
  await deleteTimesheet(parsed);
  revalidatePath("/timesheets");
}

/** No route involved, so — unlike `saveDailyEntryAction` — there's no assignment check beyond authorization. */
export async function saveNonDrivingDayAction(input: unknown): Promise<void> {
  const { isSignedIn, role, user } = await getSessionAccess();
  const parsed = nonDrivingDayInputSchema.parse(input);

  if (!isSignedIn) {
    throw new Error("Not authorized to manage timesheets.");
  }

  const effectiveDriverId = await resolveEffectiveDriverId({ role, user }, parsed.driverId);

  await upsertNonDrivingDay({ ...parsed, driverId: effectiveDriverId });
  revalidatePath("/timesheets");
}

/** Undoes a Not Driving status. Administrators may undo any driver's; drivers only their own. */
export async function deleteNonDrivingDayAction(input: unknown): Promise<void> {
  const { isSignedIn, role, user } = await getSessionAccess();
  const parsed = dailyEntryIdentifierSchema.parse(input);

  if (!isSignedIn) {
    throw new Error("Not authorized to manage timesheets.");
  }

  const effectiveDriverId = await resolveEffectiveDriverId({ role, user }, parsed.driverId);

  await deleteNonDrivingDay({ ...parsed, driverId: effectiveDriverId });
  revalidatePath("/timesheets");
}
