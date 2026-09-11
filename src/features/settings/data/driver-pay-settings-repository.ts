import { prisma } from "@/lib/db/prisma";
import type { DriverPaySettingsRow } from "@/features/settings/types";

/** Get-or-create semantics — this table only ever holds the fixed `"default"` row. */
export async function getDriverPaySettings(): Promise<DriverPaySettingsRow> {
  const settings = await prisma.driverPaySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return { defaultHourlyRate: settings.defaultHourlyRate.toFixed(2) };
}
