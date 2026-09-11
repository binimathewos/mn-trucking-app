import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouteStatusBadge } from "@/features/routes/components/route-status-badge";
import { RouteRowActionsMenu } from "@/features/routes/components/route-row-actions-menu";
import type { RouteRow } from "@/features/routes/types";

/** `timeZone: "UTC"` matches the date-only `pickupAt` value (stored as UTC midnight) to the viewer's screen. */
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

interface RoutesTableProps {
  rows: RouteRow[];
  hasAnyRoutes: boolean;
  hasActiveFilters: boolean;
  activeClients: { id: string; companyName: string }[];
  activeDrivers: { id: string; name: string }[];
}

export function RoutesTable({ rows, hasAnyRoutes, hasActiveFilters, activeClients, activeDrivers }: RoutesTableProps) {
  if (rows.length === 0) {
    const noRoutesAtAll = !hasAnyRoutes;
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {noRoutesAtAll ? "No routes yet" : "No routes match your filters"}
        </p>
        <p className="text-sm text-muted-foreground">
          {noRoutesAtAll
            ? "Create your first route to get started."
            : hasActiveFilters
              ? "Try a different filter or search term."
              : "Try a different search term."}
        </p>
      </div>
    );
  }

  return (
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
            Driver
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Pickup date
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
            <TableCell className="font-medium text-foreground">{row.routeNumber}</TableCell>
            <TableCell>{row.clientName}</TableCell>
            <TableCell>{row.pickupAddress}</TableCell>
            <TableCell>{row.deliveryAddress}</TableCell>
            <TableCell>{row.driverName ?? "Unassigned"}</TableCell>
            <TableCell>{dateFormatter.format(new Date(row.pickupAt))}</TableCell>
            <TableCell>
              <RouteStatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              <RouteRowActionsMenu route={row} activeClients={activeClients} activeDrivers={activeDrivers} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
