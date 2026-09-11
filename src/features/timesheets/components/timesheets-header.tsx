import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssignedRouteOption } from "@/features/routes/types";
import { TimesheetEntryDialog } from "@/features/timesheets/components/timesheet-entry-dialog";
import type { Driver } from "@/features/timesheets/types";

interface TimesheetsHeaderProps {
  drivers: Driver[];
  routesByDriverId: Record<string, AssignedRouteOption[]>;
}

export function TimesheetsHeader({ drivers, routesByDriverId }: TimesheetsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Timesheets / Management
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Driver Timesheets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor submissions and review hours across your driver team.
        </p>
      </div>

      <TimesheetEntryDialog
        drivers={drivers}
        routesByDriverId={routesByDriverId}
        trigger={
          <Button className="w-full sm:w-auto">
            <Plus className="size-4" aria-hidden="true" />
            Add Timesheet
          </Button>
        }
      />
    </div>
  );
}
