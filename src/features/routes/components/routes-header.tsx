"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateRouteDialog } from "@/features/routes/components/create-route-dialog";

interface RoutesHeaderProps {
  activeClients: { id: string; companyName: string }[];
  activeDrivers: { id: string; name: string }[];
}

export function RoutesHeader({ activeClients, activeDrivers }: RoutesHeaderProps) {
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
          Operations / Routes
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Routes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage delivery and transport jobs, driver assignments, and status.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button variant="outline" render={<Link href="/clients" />} className="w-full sm:w-auto">
          <Users className="size-4" aria-hidden="true" />
          Manage clients
        </Button>

        <CreateRouteDialog
          activeClients={activeClients}
          activeDrivers={activeDrivers}
          trigger={
            <Button className="w-full sm:w-auto">
              <Plus className="size-4" aria-hidden="true" />
              Create route
            </Button>
          }
          onSuccess={() => setSuccessMessage("Route created successfully.")}
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
