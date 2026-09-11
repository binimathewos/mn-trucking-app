"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddDriverDialog } from "@/features/drivers/components/add-driver-dialog";

export function DriversHeader() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Team / Directory
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Drivers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your driver roster, assignments, and contact details.
        </p>
      </div>

      <AddDriverDialog
        trigger={
          <Button className="w-full sm:w-auto">
            <Plus className="size-4" aria-hidden="true" />
            Add driver
          </Button>
        }
        onSuccess={() => setSuccessMessage("Driver added successfully.")}
      />

      {successMessage && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg"
        >
          <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
          {successMessage}
        </div>
      )}
    </div>
  );
}
