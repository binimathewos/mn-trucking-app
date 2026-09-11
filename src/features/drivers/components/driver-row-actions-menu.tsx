"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, PlayCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditDriverDialog } from "@/features/drivers/components/edit-driver-dialog";
import { setDriverStatusAction } from "@/features/drivers/actions/driver-actions";
import type { DriverRow } from "@/features/drivers/types";

interface DriverRowActionsMenuProps {
  driver: DriverRow;
}

export function DriverRowActionsMenu({ driver }: DriverRowActionsMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  async function handleToggleStatus() {
    const nextStatus = driver.status === "INACTIVE" ? "ACTIVE" : "INACTIVE";
    const verb = nextStatus === "INACTIVE" ? "deactivate" : "reactivate";

    if (!window.confirm(`${verb === "deactivate" ? "Deactivate" : "Reactivate"} ${driver.name}?`)) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await setDriverStatusAction({ driverId: driver.id, status: nextStatus });
      router.refresh();
    } catch {
      window.alert(`Could not ${verb} this driver. Please try again.`);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const isInactive = driver.status === "INACTIVE";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${driver.name}`} />
          }
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isUpdatingStatus} onClick={handleToggleStatus}>
            {isInactive ? (
              <PlayCircle className="size-4" aria-hidden="true" />
            ) : (
              <PauseCircle className="size-4" aria-hidden="true" />
            )}
            {isInactive ? "Reactivate" : "Deactivate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditDriverDialog driver={driver} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
