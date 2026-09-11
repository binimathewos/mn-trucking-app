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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateDriverAction } from "@/features/drivers/actions/driver-actions";
import { DRIVER_CLASS_OPTIONS } from "@/features/drivers/lib/validation";
import { parseDriverActionError } from "@/features/drivers/types";
import type { DriverRow, DriverStatus } from "@/features/drivers/types";

const NO_CLASS_VALUE = "__none__";

const DRIVER_CLASS_ITEMS: Record<string, string> = {
  [NO_CLASS_VALUE]: "Select class",
  ...Object.fromEntries(DRIVER_CLASS_OPTIONS.map((option) => [option, option])),
};

const STATUS_ITEMS: Record<DriverStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On leave",
};

interface EditDriverDialogProps {
  driver: DriverRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * `EditDriverDialog` is opened externally (a row-actions dropdown item sets
 * `open` directly), so there's no Dialog-initiated "open" event to reset form
 * state from. Instead, this inner form only mounts while `open` is true —
 * each open is a fresh mount, so its `useState` initializers naturally pick
 * up the driver's current values with no reset effect needed.
 */
function EditDriverForm({
  driver,
  onOpenChange,
}: {
  driver: DriverRow;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(driver.name);
  const [phone, setPhone] = useState(driver.phone ?? "");
  const [driverClass, setDriverClass] = useState(driver.driverClass || NO_CLASS_VALUE);
  const [truckNumber, setTruckNumber] = useState(driver.truckNumber ?? "");
  const [status, setStatus] = useState<DriverStatus>(driver.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await updateDriverAction({
        driverId: driver.id,
        fullName,
        phone: phone || undefined,
        driverClass: driverClass === NO_CLASS_VALUE ? undefined : driverClass,
        truckNumber: truckNumber || undefined,
        status,
      });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const parsed = parseDriverActionError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Team / Directory
        </p>
        <DialogTitle className="text-xl">Edit driver</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Update this driver&apos;s profile and truck assignment.
        </p>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Full name
          <Input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.fullName)}
          />
          {fieldErrors.fullName && (
            <span className="text-xs text-destructive">{fieldErrors.fullName}</span>
          )}
        </label>

        <div className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Email address
          <Input value={driver.email} disabled />
          <span className="text-xs text-muted-foreground">Email can&apos;t be changed here.</span>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Phone number
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(612) 555-0100"
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldErrors.phone && (
            <span className="text-xs text-destructive">{fieldErrors.phone}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Driver class
          <Select
            items={DRIVER_CLASS_ITEMS}
            value={driverClass}
            onValueChange={(value) => setDriverClass(value ?? NO_CLASS_VALUE)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CLASS_VALUE}>Select class</SelectItem>
              {DRIVER_CLASS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Assigned truck
          <Input
            value={truckNumber}
            onChange={(event) => setTruckNumber(event.target.value)}
            placeholder="e.g. MN-124"
            aria-invalid={Boolean(fieldErrors.truckNumber)}
          />
          {fieldErrors.truckNumber && (
            <span className="text-xs text-destructive">{fieldErrors.truckNumber}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Status
          <Select
            items={STATUS_ITEMS}
            value={status}
            onValueChange={(value) => setStatus((value as DriverStatus) ?? status)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ON_LEAVE">On leave</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>

      {formError && !Object.keys(fieldErrors).length && (
        <p className="text-sm text-destructive">{formError}</p>
      )}

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
          <Check className="size-4" aria-hidden="true" />
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function EditDriverDialog({ driver, open, onOpenChange }: EditDriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <EditDriverForm key={driver.id} driver={driver} onOpenChange={onOpenChange} />}
    </Dialog>
  );
}
