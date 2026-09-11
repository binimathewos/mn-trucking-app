"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
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
import { addDriverAction } from "@/features/drivers/actions/driver-actions";
import { DRIVER_CLASS_OPTIONS } from "@/features/drivers/lib/validation";
import { parseDriverActionError } from "@/features/drivers/types";

const NO_CLASS_VALUE = "__none__";

const DRIVER_CLASS_ITEMS: Record<string, string> = {
  [NO_CLASS_VALUE]: "Select class",
  ...Object.fromEntries(DRIVER_CLASS_OPTIONS.map((option) => [option, option])),
};

interface AddDriverDialogProps {
  trigger: ReactElement;
  onSuccess?: () => void;
}

export function AddDriverDialog({ trigger, onSuccess }: AddDriverDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [driverClass, setDriverClass] = useState(NO_CLASS_VALUE);
  const [truckNumber, setTruckNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setFullName("");
    setEmail("");
    setTemporaryPassword("");
    setPhone("");
    setDriverClass(NO_CLASS_VALUE);
    setTruckNumber("");
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await addDriverAction({
        fullName,
        email,
        temporaryPassword,
        phone: phone || undefined,
        driverClass: driverClass === NO_CLASS_VALUE ? undefined : driverClass,
        truckNumber: truckNumber || undefined,
      });
      setOpen(false);
      resetForm();
      router.refresh();
      onSuccess?.();
    } catch (error) {
      const parsed = parseDriverActionError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = fullName.trim() && email.trim() && temporaryPassword.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Team / Directory
          </p>
          <DialogTitle className="text-xl">Add driver</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create a driver profile and assign their workspace access.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Full name
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="e.g. Alex Morgan"
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            {fieldErrors.fullName && (
              <span className="text-xs text-destructive">{fieldErrors.fullName}</span>
            )}
          </label>

          <div className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Role
            <Input value="Driver" disabled />
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
            Email address
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="alex@mntrucking.com"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <span className="text-xs text-destructive">{fieldErrors.email}</span>
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

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground sm:col-span-2">
            Temporary password
            <Input
              type="password"
              value={temporaryPassword}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              placeholder="At least 8 characters"
              aria-invalid={Boolean(fieldErrors.temporaryPassword)}
            />
            <span className="text-xs text-muted-foreground">
              Used to sign in immediately — never stored by this app.
            </span>
            {fieldErrors.temporaryPassword && (
              <span className="text-xs text-destructive">{fieldErrors.temporaryPassword}</span>
            )}
          </label>
        </div>

        {formError && !Object.keys(fieldErrors).length && (
          <p className="text-sm text-destructive">{formError}</p>
        )}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
            className="w-full sm:w-auto"
          >
            <Check className="size-4" aria-hidden="true" />
            {isSubmitting ? "Adding…" : "Add driver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
