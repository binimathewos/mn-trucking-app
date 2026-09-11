"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Eye, MoreHorizontal, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssignDriverDialog } from "@/features/routes/components/assign-driver-dialog";
import { EditRouteDialog } from "@/features/routes/components/edit-route-dialog";
import { RouteDetailsDialog } from "@/features/routes/components/route-details-dialog";
import { cancelRouteAction } from "@/features/routes/actions/route-actions";
import { isFinalStatus } from "@/features/routes/lib/route-status";
import { parseRouteActionError } from "@/features/routes/types";
import type { RouteRow } from "@/features/routes/types";

interface RouteRowActionsMenuProps {
  route: RouteRow;
  activeClients: { id: string; companyName: string }[];
  activeDrivers: { id: string; name: string }[];
}

export function RouteRowActionsMenu({ route, activeClients, activeDrivers }: RouteRowActionsMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const locked = isFinalStatus(route.status);

  async function handleCancel() {
    if (!window.confirm(`Cancel ${route.routeNumber}? This can't be undone.`)) {
      return;
    }
    setIsCancelling(true);
    try {
      await cancelRouteAction({ routeId: route.id });
      router.refresh();
    } catch (error) {
      window.alert(parseRouteActionError(error).message);
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${route.routeNumber}`} />}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
            <Eye className="size-4" aria-hidden="true" />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem disabled={locked} onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={locked} onClick={() => setAssignOpen(true)}>
            <UserPlus className="size-4" aria-hidden="true" />
            {route.driverId ? "Reassign driver" : "Assign driver"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={locked || isCancelling} onClick={handleCancel} variant="destructive">
            <Ban className="size-4" aria-hidden="true" />
            Cancel route
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditRouteDialog route={route} activeClients={activeClients} open={editOpen} onOpenChange={setEditOpen} />
      <AssignDriverDialog route={route} activeDrivers={activeDrivers} open={assignOpen} onOpenChange={setAssignOpen} />
      <RouteDetailsDialog route={route} open={detailsOpen} onOpenChange={setDetailsOpen} canManage />
    </>
  );
}
