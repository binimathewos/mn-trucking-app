"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddClientDialog } from "@/features/clients/components/add-client-dialog";

export function ClientsHeader() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/routes" />}
        nativeButton={false}
        className="w-fit -ml-2.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to routes
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Operations / Clients
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the reusable client list used by route forms.
          </p>
        </div>

        <AddClientDialog
          trigger={
            <Button className="w-full sm:w-auto">
              <Plus className="size-4" aria-hidden="true" />
              Add client
            </Button>
          }
          onCreated={() => setSuccessMessage("Client added successfully.")}
        />
      </div>

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
