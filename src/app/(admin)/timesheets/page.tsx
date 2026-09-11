import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { prisma } from "@/lib/db/prisma";
import { getAssignedRoutesByDriverProfileIds } from "@/features/routes/data/route-repository";
import type { AssignedRouteOption } from "@/features/routes/types";
import { DriverSubmissionsTable } from "@/features/timesheets/components/driver-submissions-table";
import { FiltersBar } from "@/features/timesheets/components/filters-bar";
import { MyTimesheetSummary } from "@/features/timesheets/components/my-timesheet-summary";
import { SummaryCards } from "@/features/timesheets/components/summary-cards";
import { TimesheetDayRow } from "@/features/timesheets/components/timesheet-day-row";
import { TimesheetEntryDialog } from "@/features/timesheets/components/timesheet-entry-dialog";
import { TimesheetsHeader } from "@/features/timesheets/components/timesheets-header";
import {
  getDriverSubmissions,
  getTeamDirectory,
  getWeekOptions,
} from "@/features/timesheets/data/timesheet-repository";
import { getTimesheetSummary, getWeekDates } from "@/features/timesheets/lib/calculations";

interface TimesheetsPageProps {
  searchParams: Promise<{ driverId?: string | string[]; week?: string | string[] }>;
}

const timesheetsSearchParamsSchema = z.object({
  driverId: z.string().min(1).optional(),
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function TimesheetsPage({ searchParams }: TimesheetsPageProps) {
  const { role, user } = await getSessionAccess();

  const rawParams = await searchParams;
  const parsedParams = timesheetsSearchParamsSchema.safeParse({
    driverId: firstValue(rawParams.driverId),
    week: firstValue(rawParams.week),
  });
  const { driverId, week: requestedWeek } = parsedParams.success ? parsedParams.data : {};

  const weekOptions = getWeekOptions();
  const weekStart = weekOptions.some((option) => option.value === requestedWeek)
    ? requestedWeek!
    : weekOptions[0]!.value;

  if (role !== "administrator") {
    const sessionUser = user
      ? await prisma.user.findUnique({ where: { clerkUserId: user.id }, include: { driver: true } })
      : null;
    const ownDriverProfileId = sessionUser?.driver?.id;
    const ownUserId = sessionUser?.id;

    const [rows, assignedRoutes] = await Promise.all([
      ownUserId ? getDriverSubmissions(weekStart, ownUserId) : Promise.resolve([]),
      ownDriverProfileId
        ? getAssignedRoutesByDriverProfileIds([ownDriverProfileId])
        : Promise.resolve<Record<string, AssignedRouteOption[]>>({}),
    ]);
    const row = rows[0] ?? null;
    const myRoutes = ownDriverProfileId ? (assignedRoutes[ownDriverProfileId] ?? []) : [];
    const routesByDriverId = ownUserId ? { [ownUserId]: myRoutes } : {};
    const entriesByDate = new Map((row?.dailyEntries ?? []).map((entry) => [entry.date, entry]));
    const nonDrivingByDate = new Map((row?.nonDrivingDays ?? []).map((day) => [day.date, day]));
    const weekDates = getWeekDates(weekStart);

    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Driver Portal / Personal
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground">My timesheets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit your daily hours and review your recent work.
            </p>
          </div>

          {ownUserId && (
            <TimesheetEntryDialog
              drivers={[{ id: ownUserId, name: "Me", roleType: "", truckNumber: null, driverProfileId: ownDriverProfileId ?? null }]}
              routesByDriverId={routesByDriverId}
              defaultDriverId={ownUserId}
              lockDriver
              trigger={
                <Button className="w-full sm:w-auto">
                  <Plus className="size-4" aria-hidden="true" />
                  Add Timesheet
                </Button>
              }
            />
          )}
        </div>

        {row && <MyTimesheetSummary row={row} />}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">This week</CardTitle>
            <CardDescription>Log your hours, or mark a day as not driving</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {ownUserId && (
              <div className="flex flex-col divide-y divide-border border-y border-border">
                {weekDates.map((date) => (
                  <TimesheetDayRow
                    key={date}
                    date={date}
                    weekStart={weekStart}
                    entry={entriesByDate.get(date)}
                    nonDrivingDay={nonDrivingByDate.get(date)}
                    driverId={ownUserId}
                    drivers={[
                      {
                        id: ownUserId,
                        name: "Me",
                        roleType: "",
                        truckNumber: null,
                        driverProfileId: ownDriverProfileId ?? null,
                      },
                    ]}
                    routesByDriverId={routesByDriverId}
                    allowDeleteEntry={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [drivers, rows] = await Promise.all([
    getTeamDirectory(),
    getDriverSubmissions(weekStart, driverId),
  ]);

  const driverProfileIds = drivers
    .map((driver) => driver.driverProfileId)
    .filter((id): id is string => id !== null);
  const assignedRoutesByProfileId = await getAssignedRoutesByDriverProfileIds(driverProfileIds);
  const routesByDriverId: Record<string, AssignedRouteOption[]> = Object.fromEntries(
    drivers.map((driver) => [
      driver.id,
      driver.driverProfileId ? (assignedRoutesByProfileId[driver.driverProfileId] ?? []) : [],
    ]),
  );

  const summary = getTimesheetSummary(rows);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <TimesheetsHeader drivers={drivers} routesByDriverId={routesByDriverId} />
      <SummaryCards summary={summary} />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Driver submissions</CardTitle>
            <CardDescription>Current weekly timesheet status by driver</CardDescription>
          </div>
          <FiltersBar
            drivers={drivers}
            weekOptions={weekOptions}
            currentDriverId={driverId}
            currentWeek={weekStart}
          />
        </CardHeader>
        <CardContent>
          <DriverSubmissionsTable
            rows={rows}
            weekStart={weekStart}
            drivers={drivers}
            routesByDriverId={routesByDriverId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
