import { prisma } from "@/lib/db/prisma";
import {
  computeCalculatedPay,
  computeHoursFromTimeRange,
  computeTotalCalculatedPay,
  deriveLastSubmittedAt,
  deriveStatus,
  deriveTotalHours,
  getWeekDates,
} from "@/features/timesheets/lib/calculations";
import type {
  DailyEntry,
  Driver,
  DriverSubmissionRow,
  NonDrivingDayInfo,
  NonDrivingReason,
  WeekOption,
} from "@/features/timesheets/types";

const WEEK_OPTION_COUNT = 8;

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const weekRangeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatWeekLabel(weekStart: string, isCurrentWeek: boolean): string {
  if (isCurrentWeek) {
    return "This week";
  }

  const dates = getWeekDates(weekStart);
  const start = new Date(`${dates[0]}T00:00:00.000Z`);
  const end = new Date(`${dates[6]}T00:00:00.000Z`);

  return `${weekRangeFormatter.format(start)} – ${weekRangeFormatter.format(end)}, ${end.getUTCFullYear()}`;
}

/** Pure, DB-free: the current week plus the 7 preceding weeks, for the week filter. */
export function getWeekOptions(referenceDate: Date = new Date()): WeekOption[] {
  const currentWeekStart = mondayOf(referenceDate);

  return Array.from({ length: WEEK_OPTION_COUNT }, (_, index) => {
    const weekStartDate = new Date(currentWeekStart);
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - index * 7);
    const value = toIsoDate(weekStartDate);

    return { value, label: formatWeekLabel(value, index === 0) };
  });
}

function toRoleType(user: { role: string; driver: { roleType: string } | null }): string {
  return user.role === "ADMINISTRATOR" ? "Administrator" : (user.driver?.roleType ?? "");
}

function toTruckNumber(user: { role: string; driver: { truckNumber: string | null } | null }): string | null {
  return user.role === "DRIVER" ? (user.driver?.truckNumber ?? null) : null;
}

/** Every User (Administrators and Drivers alike), mapped to the Driver view-model. */
export async function getTeamDirectory(): Promise<Driver[]> {
  const users = await prisma.user.findMany({
    include: { driver: true },
    orderBy: { name: "asc" },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    roleType: toRoleType(user),
    truckNumber: toTruckNumber(user),
    driverProfileId: user.driver?.id ?? null,
  }));
}

/** One row per user in scope for `weekStart`, left-joined against Timesheet/TimesheetEntry. */
export async function getDriverSubmissions(
  weekStart: string,
  driverId?: string,
): Promise<DriverSubmissionRow[]> {
  const users = await prisma.user.findMany({
    where: driverId ? { id: driverId } : undefined,
    include: {
      driver: true,
      timesheets: {
        where: { weekStart: toDateOnly(weekStart) },
        include: { entries: { include: { route: true } }, nonDrivingDays: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return users.map((user) => {
    const entries = user.timesheets[0]?.entries ?? [];
    const dailyEntries: DailyEntry[] = entries
      .map((entry) => {
        const hourlyRate = entry.route ? entry.route.hourlyRate.toFixed(2) : null;
        return {
          date: toIsoDate(entry.date),
          startTime: entry.startTime,
          endTime: entry.endTime,
          hours: entry.hours,
          savedAt: entry.savedAt.toISOString(),
          routeId: entry.routeId,
          routeLabel: entry.route ? `${entry.route.pickupAddress} → ${entry.route.deliveryAddress}` : null,
          hourlyRate,
          calculatedPay: computeCalculatedPay(entry.hours, hourlyRate),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const nonDrivingDays: NonDrivingDayInfo[] = (user.timesheets[0]?.nonDrivingDays ?? [])
      .map((day) => ({
        date: toIsoDate(day.date),
        reason: day.reason as NonDrivingReason,
        savedAt: day.savedAt.toISOString(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      driverId: user.id,
      driverName: user.name,
      roleType: toRoleType(user),
      truckNumber: toTruckNumber(user),
      hoursLogged: deriveTotalHours(dailyEntries),
      lastSubmittedAt: deriveLastSubmittedAt(dailyEntries),
      status: deriveStatus(weekStart, dailyEntries, nonDrivingDays),
      dailyEntries,
      nonDrivingDays,
      totalCalculatedPay: computeTotalCalculatedPay(dailyEntries),
    };
  });
}

interface DailyEntryWriteInput {
  driverId: string;
  weekStart: string;
  date: string;
  startTime: string;
  endTime: string;
  routeId: string;
}

/**
 * Creates the parent Timesheet if needed, then creates or replaces the entry
 * for `date`. Clears any Not Driving status on that date first — a day can
 * never carry both a logged entry and a Not Driving status at once.
 */
export async function upsertDailyEntry(input: DailyEntryWriteInput): Promise<void> {
  const weekStart = toDateOnly(input.weekStart);
  const date = toDateOnly(input.date);

  const timesheet = await prisma.timesheet.upsert({
    where: { userId_weekStart: { userId: input.driverId, weekStart } },
    update: {},
    create: { userId: input.driverId, weekStart },
  });

  await prisma.nonDrivingDay.deleteMany({ where: { timesheetId: timesheet.id, date } });

  await prisma.timesheetEntry.upsert({
    where: { timesheetId_date: { timesheetId: timesheet.id, date } },
    update: {
      startTime: input.startTime,
      endTime: input.endTime,
      hours: computeHoursFromTimeRange(input.startTime, input.endTime),
      routeId: input.routeId,
      savedAt: new Date(),
    },
    create: {
      timesheetId: timesheet.id,
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      hours: computeHoursFromTimeRange(input.startTime, input.endTime),
      routeId: input.routeId,
    },
  });
}

interface DailyEntryDeleteInput {
  driverId: string;
  weekStart: string;
  date: string;
}

/** No-op if no matching timesheet or entry exists. */
export async function deleteDailyEntry(input: DailyEntryDeleteInput): Promise<void> {
  const timesheet = await prisma.timesheet.findUnique({
    where: { userId_weekStart: { userId: input.driverId, weekStart: toDateOnly(input.weekStart) } },
  });

  if (!timesheet) {
    return;
  }

  await prisma.timesheetEntry.deleteMany({
    where: { timesheetId: timesheet.id, date: toDateOnly(input.date) },
  });
}

interface NonDrivingDayWriteInput {
  driverId: string;
  weekStart: string;
  date: string;
  reason: NonDrivingReason;
}

/**
 * Creates the parent Timesheet if needed, then marks `date` as Not Driving
 * with `reason`. Clears any logged entry on that date first — a day can
 * never carry both a logged entry and a Not Driving status at once.
 */
export async function upsertNonDrivingDay(input: NonDrivingDayWriteInput): Promise<void> {
  const weekStart = toDateOnly(input.weekStart);
  const date = toDateOnly(input.date);

  const timesheet = await prisma.timesheet.upsert({
    where: { userId_weekStart: { userId: input.driverId, weekStart } },
    update: {},
    create: { userId: input.driverId, weekStart },
  });

  await prisma.timesheetEntry.deleteMany({ where: { timesheetId: timesheet.id, date } });

  await prisma.nonDrivingDay.upsert({
    where: { timesheetId_date: { timesheetId: timesheet.id, date } },
    update: { reason: input.reason, savedAt: new Date() },
    create: { timesheetId: timesheet.id, date, reason: input.reason },
  });
}

/** Undoes a Not Driving status. No-op if no matching timesheet or record exists. */
export async function deleteNonDrivingDay(input: DailyEntryDeleteInput): Promise<void> {
  const timesheet = await prisma.timesheet.findUnique({
    where: { userId_weekStart: { userId: input.driverId, weekStart: toDateOnly(input.weekStart) } },
  });

  if (!timesheet) {
    return;
  }

  await prisma.nonDrivingDay.deleteMany({
    where: { timesheetId: timesheet.id, date: toDateOnly(input.date) },
  });
}

interface TimesheetDeleteInput {
  driverId: string;
  weekStart: string;
}

/** No-op if no matching timesheet exists; cascades to its entries. */
export async function deleteTimesheet(input: TimesheetDeleteInput): Promise<void> {
  await prisma.timesheet.deleteMany({
    where: { userId: input.driverId, weekStart: toDateOnly(input.weekStart) },
  });
}
