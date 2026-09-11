import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DriverStatusBadge } from "@/features/drivers/components/driver-status-badge";
import { DriverRowActionsMenu } from "@/features/drivers/components/driver-row-actions-menu";
import type { DriverRow } from "@/features/drivers/types";

const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const absoluteDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatLastActivity(value: string | null): string {
  if (!value) {
    return "Not yet active";
  }

  const activity = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (activity.toDateString() === now.toDateString()) {
    return `Today, ${timeFormatter.format(activity)}`;
  }

  if (activity.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeFormatter.format(activity)}`;
  }

  return absoluteDateFormatter.format(activity);
}

interface DriverDirectoryTableProps {
  rows: DriverRow[];
  hasActiveFilters: boolean;
}

export function DriverDirectoryTable({ rows, hasActiveFilters }: DriverDirectoryTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-10 text-center">
        <p className="text-sm font-medium text-foreground">
          {hasActiveFilters ? "No drivers match your filters" : "No drivers yet"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters
            ? "Try a different status or search term."
            : "Add your first driver to build out the roster."}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Driver
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Contact
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Assigned truck
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Status
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Last activity
          </TableHead>
          <TableHead className="w-8">
            <span className="sr-only">Row actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {row.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.driverClass}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>{row.phone ?? "—"}</TableCell>
            <TableCell>{row.truckNumber ?? "Unassigned"}</TableCell>
            <TableCell>
              <DriverStatusBadge status={row.status} />
            </TableCell>
            <TableCell>{formatLastActivity(row.lastActivity)}</TableCell>
            <TableCell>
              <DriverRowActionsMenu driver={row} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
