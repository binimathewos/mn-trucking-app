"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RouteStatusBadge } from "@/features/routes/components/route-status-badge";
import { setRouteStatusAction } from "@/features/routes/actions/route-actions";
import { isFinalStatus } from "@/features/routes/lib/route-status";
import { parseRouteActionError } from "@/features/routes/types";
import type { RouteRow, RouteStatus } from "@/features/routes/types";

/**
 * `timeZone: "UTC"` keeps the displayed calendar date matched to what was
 * entered — `pickupAt`/`deliveryAt` are stored as UTC midnight for the
 * chosen date, and formatting in the viewer's local zone could otherwise
 * shift the displayed date by a day.
 */
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string | null): string {
  return iso ? dateFormatter.format(new Date(iso)) : "—";
}

const STATUS_ITEMS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

interface RouteDetailsDialogProps {
  route: RouteRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit for the driver-facing read-only view — hides the "Set status" control. */
  canManage?: boolean;
}

export function RouteDetailsDialog({ route, open, onOpenChange, canManage = false }: RouteDetailsDialogProps) {
  const router = useRouter();
  const [status, setStatus] = useState<RouteStatus>(route.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = isFinalStatus(route.status);

  async function handleStatusChange(nextStatus: string | null) {
    if (!nextStatus || nextStatus === status) {
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      await setRouteStatusAction({ routeId: route.id, status: nextStatus });
      setStatus(nextStatus as RouteStatus);
      router.refresh();
    } catch (err) {
      setError(parseRouteActionError(err).message);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Operations / Routes
            </p>
            <DialogTitle className="text-xl">{route.routeNumber}</DialogTitle>
            <RouteStatusBadge status={status} />
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow label="Client" value={route.clientName} />
            <DetailRow label="Reference number" value={route.referenceNumber ?? "—"} />
            <DetailRow label="Pickup address" value={route.pickupAddress} />
            <DetailRow label="Delivery address" value={route.deliveryAddress} />
            <DetailRow label="Pickup date" value={formatDate(route.pickupAt)} />
            <DetailRow label="Delivery date" value={formatDate(route.deliveryAt)} />
            <DetailRow label="Driver" value={route.driverName ?? "Unassigned"} />
            <DetailRow label="Truck" value={route.truckNumber ?? "No truck"} />
            <DetailRow label="Notes" value={route.notes ?? "—"} />
          </div>

          {canManage && (
            <div className="flex flex-col gap-1 border-t pt-4 text-sm font-medium text-foreground">
              Set status
              <Select
                items={STATUS_ITEMS}
                value={status}
                onValueChange={handleStatusChange}
                disabled={locked || isUpdating}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locked && (
                <span className="text-xs text-muted-foreground">
                  This route is completed or cancelled and can no longer be changed.
                </span>
              )}
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
