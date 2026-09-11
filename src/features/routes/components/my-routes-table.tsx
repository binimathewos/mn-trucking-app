"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouteDetailsDialog } from "@/features/routes/components/route-details-dialog";
import { RouteStatusBadge } from "@/features/routes/components/route-status-badge";
import type { RouteRow } from "@/features/routes/types";

/** `timeZone: "UTC"` matches the date-only `pickupAt` value (stored as UTC midnight) to the viewer's screen. */
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

interface MyRoutesTableProps {
  rows: RouteRow[];
}

export function MyRoutesTable({ rows }: MyRoutesTableProps) {
  const [selectedRoute, setSelectedRoute] = useState<RouteRow | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No routes assigned yet</p>
        <p className="text-sm text-muted-foreground">
          Routes assigned to you will show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Route
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Client
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Pickup
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Delivery
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Pickup date
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => setSelectedRoute(row)}
            >
              <TableCell className="font-medium text-foreground">{row.routeNumber}</TableCell>
              <TableCell>{row.clientName}</TableCell>
              <TableCell>{row.pickupAddress}</TableCell>
              <TableCell>{row.deliveryAddress}</TableCell>
              <TableCell>{dateFormatter.format(new Date(row.pickupAt))}</TableCell>
              <TableCell>
                <RouteStatusBadge status={row.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedRoute && (
        <RouteDetailsDialog
          route={selectedRoute}
          open={Boolean(selectedRoute)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedRoute(null);
            }
          }}
        />
      )}
    </>
  );
}
