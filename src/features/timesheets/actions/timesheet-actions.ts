"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { resolveAdminOnlyAccess } from "@/lib/auth/route-access";
import { dailyEntryInputSchema } from "@/features/timesheets/lib/calculations";
import {
  deleteDailyEntry,
  deleteTimesheet,
  upsertDailyEntry,
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

export async function saveDailyEntryAction(input: unknown): Promise<void> {
  await assertAdminAccess();
  const parsed = dailyEntryInputSchema.parse(input);
  await upsertDailyEntry(parsed);
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
