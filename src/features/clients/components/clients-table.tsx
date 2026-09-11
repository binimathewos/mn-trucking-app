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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientStatusBadge } from "@/features/clients/components/client-status-badge";
import { EditClientDialog } from "@/features/clients/components/edit-client-dialog";
import { setClientStatusAction } from "@/features/clients/actions/client-actions";
import { parseClientActionError } from "@/features/clients/types";
import type { ClientRow } from "@/features/clients/types";

interface ClientRowActionsProps {
  client: ClientRow;
}

function ClientRowActions({ client }: ClientRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isInactive = client.status === "INACTIVE";

  async function handleToggleStatus() {
    const nextStatus = isInactive ? "ACTIVE" : "INACTIVE";
    const verb = nextStatus === "INACTIVE" ? "Deactivate" : "Reactivate";

    if (!window.confirm(`${verb} ${client.companyName}?`)) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await setClientStatusAction({ clientId: client.id, status: nextStatus });
      router.refresh();
    } catch (error) {
      window.alert(parseClientActionError(error).message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${client.companyName}`} />}
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
            {isInactive ? "Activate" : "Deactivate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditClientDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

interface ClientsTableProps {
  rows: ClientRow[];
  hasAnyClients: boolean;
}

export function ClientsTable({ rows, hasAnyClients }: ClientsTableProps) {
  if (rows.length === 0) {
    const noClientsAtAll = !hasAnyClients;
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {noClientsAtAll ? "No clients yet" : "No clients match your search"}
        </p>
        <p className="text-sm text-muted-foreground">
          {noClientsAtAll ? "Add your first client to start creating routes." : "Try a different search term."}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Company
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Contact
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Phone
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Email
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Status
          </TableHead>
          <TableHead className="w-8">
            <span className="sr-only">Row actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-foreground">{row.companyName}</TableCell>
            <TableCell>{row.contactName}</TableCell>
            <TableCell>{row.phone}</TableCell>
            <TableCell>{row.email}</TableCell>
            <TableCell>
              <ClientStatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              <ClientRowActions client={row} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
