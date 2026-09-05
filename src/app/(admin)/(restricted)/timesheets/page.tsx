import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DriverSubmissionsTable } from "@/features/timesheets/components/driver-submissions-table";
import { FiltersBar } from "@/features/timesheets/components/filters-bar";
import { SummaryCards } from "@/features/timesheets/components/summary-cards";
import { TimesheetsHeader } from "@/features/timesheets/components/timesheets-header";
import {
  getDriverSubmissions,
  getTeamDirectory,
  getWeekOptions,
} from "@/features/timesheets/data/timesheet-repository";
import { getTimesheetSummary } from "@/features/timesheets/lib/calculations";

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

  const [drivers, rows] = await Promise.all([
    getTeamDirectory(),
    getDriverSubmissions(weekStart, driverId),
  ]);

  const summary = getTimesheetSummary(rows);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <TimesheetsHeader drivers={drivers} />
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
          <DriverSubmissionsTable rows={rows} weekStart={weekStart} drivers={drivers} />
        </CardContent>
      </Card>
    </div>
  );
}
