"use client";

import { type ReactElement, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/features/timesheets/components/status-badge";
import { TimesheetEntryDialog } from "@/features/timesheets/components/timesheet-entry-dialog";
import {
  deleteDailyEntryAction,
  deleteTimesheetAction,
} from "@/features/timesheets/actions/timesheet-actions";
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
}

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export function DriverTimesheetDetailDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  row,
  weekStart,
  drivers,
}: DriverTimesheetDetailDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = trigger !== undefined ? internalOpen : (controlledOpen ?? false);
  const setOpen = trigger !== undefined ? setInternalOpen : (setControlledOpen ?? (() => {}));
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [isDeletingTimesheet, setIsDeletingTimesheet] = useState(false);

  const entriesByDate = new Map(row.dailyEntries.map((entry) => [entry.date, entry]));
  const weekDates = getWeekDates(weekStart);

  async function handleDeleteEntry(date: string) {
    if (!window.confirm("Delete this daily entry?")) {
      return;
    }

    setPendingDate(date);
    try {
      await deleteDailyEntryAction({ driverId: row.driverId, weekStart, date });
      router.refresh();
    } catch {
      window.alert("Could not delete this entry. Please try again.");
    } finally {
      setPendingDate(null);
    }
  }

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
          {weekDates.map((date) => {
            const entry = entriesByDate.get(date);

            return (
              <div key={date} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{dayFormatter.format(new Date(`${date}T00:00:00.000Z`))}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry ? `${entry.startTime} – ${entry.endTime} · ${entry.hours} hrs` : "No entry"}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <TimesheetEntryDialog
                    drivers={drivers}
                    defaultDriverId={row.driverId}
                    lockDriver
                    defaultDate={date}
                    initialEntry={entry ? { date, startTime: entry.startTime, endTime: entry.endTime } : undefined}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={entry ? `Edit entry for ${date}` : `Add entry for ${date}`}
                      >
                        {entry ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
                      </Button>
                    }
                  />
                  {entry && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete entry for ${date}`}
                      disabled={pendingDate === date}
                      onClick={() => handleDeleteEntry(date)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={handleDeleteTimesheet}
          disabled={row.dailyEntries.length === 0 || isDeletingTimesheet}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {isDeletingTimesheet ? "Deleting…" : "Delete entire timesheet"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
