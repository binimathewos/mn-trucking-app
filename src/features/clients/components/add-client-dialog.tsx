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
import { addClientAction } from "@/features/clients/actions/client-actions";
import { parseClientActionError } from "@/features/clients/types";

interface AddClientDialogProps {
  trigger: ReactElement;
  /** Called with the newly created client, in addition to the normal close/refresh behavior. */
  onCreated?: (client: { id: string; companyName: string }) => void;
  /**
   * Skips `router.refresh()` on success — used when nested inside
   * `CreateRouteDialog` (research.md #5), where a refresh would risk
   * unmounting the parent dialog's in-progress form state.
   */
  skipRefresh?: boolean;
}

export function AddClientDialog({ trigger, onCreated, skipRefresh = false }: AddClientDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setCompanyName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const { client } = await addClientAction({ companyName, contactName, phone, email, address });
      setOpen(false);
      resetForm();
      if (!skipRefresh) {
        router.refresh();
      }
      onCreated?.(client);
    } catch (error) {
      const parsed = parseClientActionError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit =
    companyName.trim() && contactName.trim() && phone.trim() && email.trim() && address.trim();

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
            Operations / Clients
          </p>
          <DialogTitle className="text-xl">Add client</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create a reusable client record for route creation.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Company name
            <Input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="e.g. Acme Logistics"
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
              placeholder="e.g. Jamie Lee"
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
              placeholder="(612) 555-0100"
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
              placeholder="jamie@acme.com"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <span className="text-xs text-destructive">{fieldErrors.email}</span>}
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground sm:col-span-2">
            Address
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="123 Main St, Minneapolis, MN"
              aria-invalid={Boolean(fieldErrors.address)}
            />
            {fieldErrors.address && <span className="text-xs text-destructive">{fieldErrors.address}</span>}
          </label>
        </div>

        {formError && !Object.keys(fieldErrors).length && (
          <p className="text-sm text-destructive">{formError}</p>
        )}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit} className="w-full sm:w-auto">
            <Check className="size-4" aria-hidden="true" />
            {isSubmitting ? "Adding…" : "Add client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
