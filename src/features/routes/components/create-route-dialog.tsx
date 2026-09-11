"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { AddClientDialog } from "@/features/clients/components/add-client-dialog";
import { createRouteAction } from "@/features/routes/actions/route-actions";
import { parseRouteActionError } from "@/features/routes/types";

const NO_DRIVER_VALUE = "__unassigned__";

interface CreateRouteDialogProps {
  trigger: ReactElement;
  activeClients: { id: string; companyName: string }[];
  activeDrivers: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function CreateRouteDialog({
  trigger,
  activeClients,
  activeDrivers,
  onSuccess,
}: CreateRouteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState(activeClients);
  const [clientId, setClientId] = useState("");
  const [driverId, setDriverId] = useState(NO_DRIVER_VALUE);
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [deliveryAt, setDeliveryAt] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clientItems: Record<string, string> = Object.fromEntries(
    clients.map((client) => [client.id, client.companyName]),
  );
  const driverItems: Record<string, string> = {
    [NO_DRIVER_VALUE]: "Unassigned",
    ...Object.fromEntries(activeDrivers.map((driver) => [driver.id, driver.name])),
  };

  function resetForm() {
    setClients(activeClients);
    setClientId("");
    setDriverId(NO_DRIVER_VALUE);
    setPickupAddress("");
    setDeliveryAddress("");
    setPickupAt("");
    setDeliveryAt("");
    setReferenceNumber("");
    setNotes("");
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await createRouteAction({
        clientId,
        pickupAddress,
        deliveryAddress,
        pickupAt,
        deliveryAt: deliveryAt || undefined,
        driverId: driverId === NO_DRIVER_VALUE ? undefined : driverId,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      });
      setOpen(false);
      resetForm();
      router.refresh();
      onSuccess?.();
    } catch (error) {
      const parsed = parseRouteActionError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = clientId && pickupAddress.trim() && deliveryAddress.trim() && pickupAt;

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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Operations / Routes
          </p>
          <DialogTitle className="text-xl">Create route</DialogTitle>
          <p className="text-sm text-muted-foreground">
            A route can be created with or without a driver assigned.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 text-sm font-medium text-foreground sm:col-span-2">
            <div className="flex items-center justify-between">
              <span>Client</span>
              <AddClientDialog
                skipRefresh
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    New client
                  </button>
                }
                onCreated={(client) => {
                  setClients((current) => [...current, client].sort((a, b) => a.companyName.localeCompare(b.companyName)));
                  setClientId(client.id);
                }}
              />
            </div>
            <Select
              items={clientItems}
              value={clientId}
              onValueChange={(value) => setClientId(value ?? "")}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(fieldErrors.clientId)}>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.clientId && <span className="text-xs text-destructive">{fieldErrors.clientId}</span>}
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Driver (optional)
            <Select
              items={driverItems}
              value={driverId}
              onValueChange={(value) => setDriverId(value ?? NO_DRIVER_VALUE)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DRIVER_VALUE}>Unassigned</SelectItem>
                {activeDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Reference number
            <Input
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              placeholder="e.g. PO-4821"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Pickup address
            <Input
              value={pickupAddress}
              onChange={(event) => setPickupAddress(event.target.value)}
              placeholder="123 A St, Minneapolis, MN"
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
              placeholder="456 B St, St. Paul, MN"
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
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground sm:col-span-2">
            Notes
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Job instructions or notes"
            />
          </label>
        </div>

        {formError && !Object.keys(fieldErrors).length && (
          <p className="text-sm text-destructive">{formError}</p>
        )}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit} className="w-full sm:w-auto">
            <Check className="size-4" aria-hidden="true" />
            {isSubmitting ? "Creating…" : "Create route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
