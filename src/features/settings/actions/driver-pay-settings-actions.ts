"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { resolveAdminOnlyAccess } from "@/lib/auth/route-access";
import { prisma } from "@/lib/db/prisma";
import { updateDefaultHourlyRateInputSchema } from "@/features/settings/lib/validation";

/** Re-checks authorization independently of the `(restricted)` route layout (defense in depth). */
async function assertAdminAccess(): Promise<void> {
  const { isSignedIn, role } = await getSessionAccess();
  const access = resolveAdminOnlyAccess({ isSignedIn, role });

  if (access.outcome !== "render") {
    throw new Error("Not authorized to manage settings.");
  }
}

export async function updateDefaultHourlyRateAction(input: unknown): Promise<void> {
  await assertAdminAccess();

  const { defaultHourlyRate } = updateDefaultHourlyRateInputSchema.parse(input);

  await prisma.driverPaySettings.upsert({
    where: { id: "default" },
    update: { defaultHourlyRate: new Prisma.Decimal(defaultHourlyRate) },
    create: { id: "default", defaultHourlyRate: new Prisma.Decimal(defaultHourlyRate) },
  });

  revalidatePath("/settings");
}
