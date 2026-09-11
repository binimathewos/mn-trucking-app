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
import { Textarea } from "@/components/ui/textarea";
import { updateRouteAction } from "@/features/routes/actions/route-actions";
import { isFinalStatus } from "@/features/routes/lib/route-status";
import { parseRouteActionError } from "@/features/routes/types";
import type { RouteRow } from "@/features/routes/types";

/**
 * `route.pickupAt`/`route.deliveryAt` are stored as a UTC-midnight instant
 * for the chosen calendar date (an `<input type="date">` value parses to UTC
 * midnight), so slicing the ISO string directly reads back the same date
 * with no local-timezone shift.
 */
function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

interface EditRouteDialogProps {
  route: RouteRow;
  activeClients: { id: string; companyName: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Only mounts its inner form while `open` is true — same pattern as
 * `EditDriverDialog` — so each open is a fresh mount that naturally picks up
 * the route's current values with no reset effect needed.
 */
function EditRouteForm({
  route,
  activeClients,
  onOpenChange,
}: {
  route: RouteRow;
  activeClients: { id: string; companyName: string }[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(route.clientId);
  const [pickupAddress, setPickupAddress] = useState(route.pickupAddress);
  const [deliveryAddress, setDeliveryAddress] = useState(route.deliveryAddress);
  const [pickupAt, setPickupAt] = useState(toDateInputValue(route.pickupAt));
  const [deliveryAt, setDeliveryAt] = useState(toDateInputValue(route.deliveryAt));
  const [referenceNumber, setReferenceNumber] = useState(route.referenceNumber ?? "");
  const [notes, setNotes] = useState(route.notes ?? "");
  const [hourlyRate, setHourlyRate] = useState(route.hourlyRate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clientItems: Record<string, string> = Object.fromEntries(
    activeClients.map((client) => [client.id, client.companyName]),
  );

  const locked = isFinalStatus(route.status);

  async function handleSubmit() {
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await updateRouteAction({
        routeId: route.id,
        clientId,
        pickupAddress,
        deliveryAddress,
        pickupAt,
        deliveryAt: deliveryAt || undefined,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
        hourlyRate,
      });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const parsed = parseRouteActionError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Operations / Routes
        </p>
        <DialogTitle className="text-xl">Edit route</DialogTitle>
        <p className="text-sm text-muted-foreground">
          {locked
            ? "This route is completed or cancelled and can no longer be edited."
            : `Update ${route.routeNumber}'s details.`}
        </p>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground sm:col-span-2">
          Client
          <Select
            items={clientItems}
            value={clientId}
            onValueChange={(value) => setClientId(value ?? clientId)}
            disabled={locked}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(fieldErrors.clientId)}>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {activeClients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.clientId && <span className="text-xs text-destructive">{fieldErrors.clientId}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Reference number
          <Input
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            disabled={locked}
          />
        </label>

        <div />

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Pickup address
          <Input
            value={pickupAddress}
            onChange={(event) => setPickupAddress(event.target.value)}
            disabled={locked}
            aria-invalid={Boolean(fieldErrors.pickupAddress)}
          />
          {fieldErrors.pickupAddress && (
            <span className="text-xs text-destructive">{fieldErrors.pickupAddress}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Delivery address
          <Input
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            disabled={locked}
            aria-invalid={Boolean(fieldErrors.deliveryAddress)}
          />
          {fieldErrors.deliveryAddress && (
            <span className="text-xs text-destructive">{fieldErrors.deliveryAddress}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Pickup date
          <Input
            type="date"
            value={pickupAt}
            onChange={(event) => setPickupAt(event.target.value)}
            disabled={locked}
            aria-invalid={Boolean(fieldErrors.pickupAt)}
          />
          {fieldErrors.pickupAt && <span className="text-xs text-destructive">{fieldErrors.pickupAt}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Delivery date (optional)
          <Input
            type="date"
            value={deliveryAt}
            onChange={(event) => setDeliveryAt(event.target.value)}
            disabled={locked}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Driver hourly rate
          <Input
            value={hourlyRate}
            onChange={(event) => setHourlyRate(event.target.value)}
            disabled={locked}
            aria-invalid={Boolean(fieldErrors.hourlyRate)}
          />
          {fieldErrors.hourlyRate && (
            <span className="text-xs text-destructive">{fieldErrors.hourlyRate}</span>
          )}
        </label>

        <div />

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground sm:col-span-2">
          Notes
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={locked} />
        </label>
      </div>

      {formError && !Object.keys(fieldErrors).length && (
        <p className="text-sm text-destructive">{formError}</p>
      )}

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting || locked} className="w-full sm:w-auto">
          <Check className="size-4" aria-hidden="true" />
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function EditRouteDialog({ route, activeClients, open, onOpenChange }: EditRouteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <EditRouteForm key={route.id} route={route} activeClients={activeClients} onOpenChange={onOpenChange} />}
    </Dialog>
  );
}
