"use client";

import { useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignedRouteOption } from "@/features/routes/types";
import { computeHoursFromTimeRange, getWeekStart } from "@/features/timesheets/lib/calculations";
import { saveDailyEntryAction } from "@/features/timesheets/actions/timesheet-actions";
import type { Driver } from "@/features/timesheets/types";

interface TimesheetEntryDialogProps {
  /** Renders its own trigger (uncontrolled). Omit to drive `open`/`onOpenChange` externally instead. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  drivers: Driver[];
  routesByDriverId: Record<string, AssignedRouteOption[]>;
  defaultDriverId?: string;
  defaultDate?: string;
  lockDriver?: boolean;
  initialEntry?: { date: string; startTime: string; endTime: string; routeId?: string | null };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TimesheetEntryDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  drivers,
  routesByDriverId,
  defaultDriverId,
  defaultDate,
  lockDriver = false,
  initialEntry,
}: TimesheetEntryDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = trigger !== undefined ? internalOpen : (controlledOpen ?? false);
  const setOpen = trigger !== undefined ? setInternalOpen : (setControlledOpen ?? (() => {}));
  const [driverId, setDriverId] = useState(defaultDriverId ?? drivers[0]?.id ?? "");
  const [date, setDate] = useState(initialEntry?.date ?? defaultDate ?? todayIso());
  const [startTime, setStartTime] = useState(initialEntry?.startTime ?? "07:00");
  const [endTime, setEndTime] = useState(initialEntry?.endTime ?? "15:30");
  const [routeId, setRouteId] = useState(initialEntry?.routeId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // base-ui's <Select.Value> only shows the selected item's label (instead of
  // its raw value) when the root is given this explicit value→label map.
  const driverItems: Record<string, string> = Object.fromEntries(
    drivers.map((driver) => [driver.id, driver.name]),
  );

  const availableRoutes = routesByDriverId[driverId] ?? [];
  const routeItems: Record<string, string> = Object.fromEntries(
    availableRoutes.map((route) => [route.id, route.routeNumber]),
  );
  const selectedRoute = availableRoutes.find((route) => route.id === routeId) ?? null;

  const totalHours = useMemo(() => {
    const hours = computeHoursFromTimeRange(startTime, endTime);
    return hours > 0 ? hours : 0;
  }, [startTime, endTime]);

  function resetToInitial() {
    setDriverId(defaultDriverId ?? drivers[0]?.id ?? "");
    setDate(initialEntry?.date ?? defaultDate ?? todayIso());
    setStartTime(initialEntry?.startTime ?? "07:00");
    setEndTime(initialEntry?.endTime ?? "15:30");
    setRouteId(initialEntry?.routeId ?? "");
    setError(null);
  }

  function handleDriverChange(nextDriverId: string) {
    setDriverId(nextDriverId);
    setRouteId("");
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      await saveDailyEntryAction({
        driverId,
        weekStart: getWeekStart(date),
        date,
        startTime,
        endTime,
        routeId,
      });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save this entry. Check the times and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          resetToInitial();
        }
      }}
    >
      {trigger !== undefined && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Quick entry
          </p>
          <DialogTitle className="text-xl">
            {initialEntry ? "Edit timesheet" : "Add timesheet"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Date
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Driver
            <Select
              items={driverItems}
              value={driverId}
              onValueChange={(value) => handleDriverChange(value ?? "")}
              disabled={lockDriver}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Start time
            <Input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            End time
            <Input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground sm:col-span-2">
            Route
            <Select
              items={routeItems}
              value={routeId}
              onValueChange={(value) => setRouteId(value ?? "")}
              disabled={availableRoutes.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={availableRoutes.length === 0 ? "No routes assigned" : "Select route"}
                />
              </SelectTrigger>
              <SelectContent>
                {availableRoutes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    <span className="flex flex-col gap-0.5 py-0.5 whitespace-normal">
                      <span className="font-medium text-foreground">{route.routeNumber}</span>
                      <span className="text-xs text-muted-foreground">{route.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRoute && (
              <span className="text-xs text-muted-foreground">{selectedRoute.label}</span>
            )}
          </label>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3">
          <Clock className="size-5 text-blue-600" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted-foreground">Total hours</p>
            <p className="text-lg font-semibold text-blue-700">{totalHours} hrs</p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !driverId || !routeId}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Saving…" : "Save timesheet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
