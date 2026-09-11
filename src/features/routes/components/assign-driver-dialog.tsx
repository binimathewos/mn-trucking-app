"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { assignDriverAction, unassignDriverAction } from "@/features/routes/actions/route-actions";
import { parseRouteActionError } from "@/features/routes/types";
import type { RouteRow } from "@/features/routes/types";

interface AssignDriverDialogProps {
  route: RouteRow;
  activeDrivers: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AssignDriverForm({
  route,
  activeDrivers,
  onOpenChange,
}: {
  route: RouteRow;
  activeDrivers: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [driverId, setDriverId] = useState(route.driverId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const driverItems: Record<string, string> = Object.fromEntries(
    activeDrivers.map((driver) => [driver.id, driver.name]),
  );

  async function handleAssign() {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await assignDriverAction({ routeId: route.id, driverId });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      setFormError(parseRouteActionError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnassign() {
    setIsUnassigning(true);
    setFormError(null);
    try {
      await unassignDriverAction({ routeId: route.id });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      setFormError(parseRouteActionError(error).message);
    } finally {
      setIsUnassigning(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Operations / Routes
        </p>
        <DialogTitle className="text-xl">{route.driverId ? "Reassign driver" : "Assign driver"}</DialogTitle>
        <p className="text-sm text-muted-foreground">{route.routeNumber}</p>
      </DialogHeader>

      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Driver
        <Select items={driverItems} value={driverId} onValueChange={(value) => setDriverId(value ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select driver" />
          </SelectTrigger>
          <SelectContent>
            {activeDrivers.map((driver) => (
              <SelectItem key={driver.id} value={driver.id}>
                {driver.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <DialogFooter>
        {route.driverId && (
          <Button
            variant="outline"
            onClick={handleUnassign}
            disabled={isUnassigning || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isUnassigning ? "Unassigning…" : "Unassign driver"}
          </Button>
        )}
        <Button onClick={handleAssign} disabled={isSubmitting || isUnassigning || !driverId} className="w-full sm:w-auto">
          <Check className="size-4" aria-hidden="true" />
          {isSubmitting ? "Saving…" : "Save assignment"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function AssignDriverDialog({ route, activeDrivers, open, onOpenChange }: AssignDriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <AssignDriverForm key={route.id} route={route} activeDrivers={activeDrivers} onOpenChange={onOpenChange} />}
    </Dialog>
  );
}
