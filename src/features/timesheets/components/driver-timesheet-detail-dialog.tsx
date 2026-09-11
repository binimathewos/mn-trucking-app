"use client";

import { type ReactElement, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AssignedRouteOption } from "@/features/routes/types";
import { StatusBadge } from "@/features/timesheets/components/status-badge";
import { TimesheetDayRow } from "@/features/timesheets/components/timesheet-day-row";
import { deleteTimesheetAction } from "@/features/timesheets/actions/timesheet-actions";
import { getWeekDates } from "@/features/timesheets/lib/calculations";
import type { Driver, DriverSubmissionRow } from "@/features/timesheets/types";

interface DriverTimesheetDetailDialogProps {
  /** Renders its own trigger (uncontrolled). Omit to drive `open`/`onOpenChange` externally instead. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  row: DriverSubmissionRow;
  weekStart: string;
  drivers: Driver[];
  routesByDriverId: Record<string, AssignedRouteOption[]>;
}

export function DriverTimesheetDetailDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  row,
  weekStart,
  drivers,
  routesByDriverId,
}: DriverTimesheetDetailDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = trigger !== undefined ? internalOpen : (controlledOpen ?? false);
  const setOpen = trigger !== undefined ? setInternalOpen : (setControlledOpen ?? (() => {}));
  const [isDeletingTimesheet, setIsDeletingTimesheet] = useState(false);

  const entriesByDate = new Map(row.dailyEntries.map((entry) => [entry.date, entry]));
  const nonDrivingByDate = new Map(row.nonDrivingDays.map((day) => [day.date, day]));
  const weekDates = getWeekDates(weekStart);
  const hasAnyData = row.dailyEntries.length > 0 || row.nonDrivingDays.length > 0;

  async function handleDeleteTimesheet() {
    if (!window.confirm(`Delete ${row.driverName}'s entire timesheet for this week?`)) {
      return;
    }

    setIsDeletingTimesheet(true);
    try {
      await deleteTimesheetAction({ driverId: row.driverId, weekStart });
      router.refresh();
    } catch {
      window.alert("Could not delete this timesheet. Please try again.");
    } finally {
      setIsDeletingTimesheet(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{row.driverName}</DialogTitle>
            <StatusBadge status={row.status} />
          </div>
          <DialogDescription>{row.roleType}</DialogDescription>
          {row.truckNumber && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Truck className="size-4" aria-hidden="true" />
              {row.truckNumber}
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {weekDates.map((date) => (
            <TimesheetDayRow
              key={date}
              date={date}
              weekStart={weekStart}
              entry={entriesByDate.get(date)}
              nonDrivingDay={nonDrivingByDate.get(date)}
              driverId={row.driverId}
              drivers={drivers}
              routesByDriverId={routesByDriverId}
            />
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-700">Total calculated pay</p>
          <p className="text-lg font-semibold text-blue-700">${row.totalCalculatedPay}</p>
        </div>

        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={handleDeleteTimesheet}
          disabled={!hasAnyData || isDeletingTimesheet}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {isDeletingTimesheet ? "Deleting…" : "Delete entire timesheet"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
