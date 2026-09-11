"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AssignedRouteOption } from "@/features/routes/types";
import { TimesheetEntryDialog } from "@/features/timesheets/components/timesheet-entry-dialog";
import {
  deleteDailyEntryAction,
  deleteNonDrivingDayAction,
  saveNonDrivingDayAction,
} from "@/features/timesheets/actions/timesheet-actions";
import { NON_DRIVING_REASONS, NON_DRIVING_REASON_LABELS } from "@/features/timesheets/lib/calculations";
import type { DailyEntry, Driver, NonDrivingDayInfo } from "@/features/timesheets/types";

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

interface TimesheetDayRowProps {
  date: string;
  weekStart: string;
  entry: DailyEntry | undefined;
  nonDrivingDay: NonDrivingDayInfo | undefined;
  driverId: string;
  drivers: Driver[];
  routesByDriverId: Record<string, AssignedRouteOption[]>;
  /** Admin's per-driver detail view allows deleting a logged entry outright; a driver's own view does not. */
  allowDeleteEntry?: boolean;
}

export function TimesheetDayRow({
  date,
  weekStart,
  entry,
  nonDrivingDay,
  driverId,
  drivers,
  routesByDriverId,
  allowDeleteEntry = true,
}: TimesheetDayRowProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleDeleteEntry() {
    if (!window.confirm("Delete this daily entry?")) {
      return;
    }

    setIsPending(true);
    try {
      await deleteDailyEntryAction({ driverId, weekStart, date });
      router.refresh();
    } catch {
      window.alert("Could not delete this entry. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleMarkNotDriving(reason: (typeof NON_DRIVING_REASONS)[number]) {
    if (entry && !window.confirm("This day already has a timesheet entry. Marking it Not Driving will remove that entry. Continue?")) {
      return;
    }

    setIsPending(true);
    try {
      await saveNonDrivingDayAction({ driverId, weekStart, date, reason });
      router.refresh();
    } catch {
      window.alert("Could not update this day. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleUndoNotDriving() {
    setIsPending(true);
    try {
      await deleteNonDrivingDayAction({ driverId, weekStart, date });
      router.refresh();
    } catch {
      window.alert("Could not undo this day's status. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">
          {dayFormatter.format(new Date(`${date}T00:00:00.000Z`))}
        </p>
        {nonDrivingDay ? (
          <p className="text-xs font-medium text-slate-600">
            Not Driving · {NON_DRIVING_REASON_LABELS[nonDrivingDay.reason]}
          </p>
        ) : entry ? (
          <>
            <p className="text-xs text-muted-foreground">
              {entry.startTime} – {entry.endTime} · {entry.hours} hrs
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.routeLabel ?? "No route"} · {entry.hourlyRate ? `$${entry.hourlyRate}/hr` : "—"} ·{" "}
              {entry.calculatedPay ? `$${entry.calculatedPay}` : "—"}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No entry</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <TimesheetEntryDialog
          drivers={drivers}
          routesByDriverId={routesByDriverId}
          defaultDriverId={driverId}
          lockDriver
          defaultDate={date}
          initialEntry={
            entry ? { date, startTime: entry.startTime, endTime: entry.endTime, routeId: entry.routeId } : undefined
          }
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              aria-label={entry ? `Edit entry for ${date}` : `Add entry for ${date}`}
            >
              {entry ? <Pencil className="size-3.5" /> : <Plus className="size-3.5" />}
            </Button>
          }
        />

        {allowDeleteEntry && entry && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete entry for ${date}`}
            disabled={isPending}
            onClick={handleDeleteEntry}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        )}

        {nonDrivingDay ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Undo Not Driving for ${date}`}
            disabled={isPending}
            onClick={handleUndoNotDriving}
          >
            <Undo2 className="size-3.5" />
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  aria-label={`Mark ${date} as Not Driving`}
                />
              }
            >
              <CalendarOff className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {NON_DRIVING_REASONS.map((reason) => (
                <DropdownMenuItem key={reason} onClick={() => handleMarkNotDriving(reason)}>
                  {NON_DRIVING_REASON_LABELS[reason]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
