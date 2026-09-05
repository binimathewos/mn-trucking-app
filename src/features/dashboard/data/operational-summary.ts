import type { OperationalSummary } from "@/features/dashboard/types";
import {
  getDriverSubmissions,
  getTeamDirectory,
  getWeekOptions,
} from "@/features/timesheets/data/timesheet-repository";
import { getTimesheetSummary } from "@/features/timesheets/lib/calculations";

const IN_INVENTORY_SUMMARY = { value: 38, trendPercent: 4.6, trendDirection: "up" } as const;

/**
 * Kept in its own module (not mock-dashboard-data.ts) because it imports the
 * Prisma-backed timesheet repository — bundling it into a file also imported
 * by a Client Component (container-inventory-card.tsx) would pull `pg` into
 * the browser bundle and fail the build.
 */
export async function getOperationalSummary(): Promise<OperationalSummary> {
  const currentWeekStart = getWeekOptions()[0]!.value;
  const [drivers, rows] = await Promise.all([
    getTeamDirectory(),
    getDriverSubmissions(currentWeekStart),
  ]);
  const { totalTeamHours } = getTimesheetSummary(rows);

  return {
    activeDrivers: { value: drivers.length, trendPercent: 0, trendDirection: "flat" },
    hoursThisWeek: { value: totalTeamHours, trendPercent: 0, trendDirection: "flat" },
    inInventory: IN_INVENTORY_SUMMARY,
  };
}

/** Edge-case variant: all-zero metrics, for validating the summary cards' zero state. */
export function getZeroOperationalSummary(): OperationalSummary {
  return {
    activeDrivers: { value: 0, trendPercent: 0, trendDirection: "flat" },
    hoursThisWeek: { value: 0, trendPercent: 0, trendDirection: "flat" },
    inInventory: { value: 0, trendPercent: 0, trendDirection: "flat" },
  };
}
