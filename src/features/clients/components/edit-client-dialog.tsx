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
import { updateClientAction } from "@/features/clients/actions/client-actions";
import { parseClientActionError } from "@/features/clients/types";
import type { ClientRow } from "@/features/clients/types";

interface EditClientDialogProps {
  client: ClientRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Only mounts its inner form while `open` is true — same pattern as
 * `EditDriverDialog` — so each open is a fresh mount that naturally picks up
 * the client's current values with no reset effect needed.
 */
function EditClientForm({
  client,
  onOpenChange,
}: {
  client: ClientRow;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(client.companyName);
  const [contactName, setContactName] = useState(client.contactName);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email);
  const [address, setAddress] = useState(client.address);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await updateClientAction({
        clientId: client.id,
        companyName,
        contactName,
        phone,
        email,
        address,
      });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const parsed = parseClientActionError(error);
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
          Operations / Clients
        </p>
        <DialogTitle className="text-xl">Edit client</DialogTitle>
        <p className="text-sm text-muted-foreground">Update this client&apos;s details.</p>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Company name
          <Input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.companyName)}
          />
          {fieldErrors.companyName && (
            <span className="text-xs text-destructive">{fieldErrors.companyName}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Contact name
          <Input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.contactName)}
          />
          {fieldErrors.contactName && (
            <span className="text-xs text-destructive">{fieldErrors.contactName}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Phone number
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          {fieldErrors.phone && <span className="text-xs text-destructive">{fieldErrors.phone}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Email address
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <span className="text-xs text-destructive">{fieldErrors.email}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground sm:col-span-2">
          Address
          <Input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            aria-invalid={Boolean(fieldErrors.address)}
          />
          {fieldErrors.address && <span className="text-xs text-destructive">{fieldErrors.address}</span>}
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

export function EditClientDialog({ client, open, onOpenChange }: EditClientDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <EditClientForm key={client.id} client={client} onOpenChange={onOpenChange} />}
    </Dialog>
  );
}
