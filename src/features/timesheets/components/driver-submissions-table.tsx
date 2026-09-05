"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { StatusBadge } from "@/features/timesheets/components/status-badge";
import { DriverTimesheetDetailDialog } from "@/features/timesheets/components/driver-timesheet-detail-dialog";
import { deleteTimesheetAction } from "@/features/timesheets/actions/timesheet-actions";
import type { Driver, DriverSubmissionRow } from "@/features/timesheets/types";

const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const absoluteDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatLastSubmitted(value: string | null): string {
  if (!value) {
    return "—";
  }

  const submitted = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (submitted.toDateString() === now.toDateString()) {
    return `Today, ${timeFormatter.format(submitted)}`;
  }

  if (submitted.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeFormatter.format(submitted)}`;
  }

  return absoluteDateFormatter.format(submitted);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

interface RowActionsProps {
  row: DriverSubmissionRow;
  weekStart: string;
  drivers: Driver[];
}

function RowActions({ row, weekStart, drivers }: RowActionsProps) {
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteTimesheet() {
    if (!window.confirm(`Delete ${row.driverName}'s entire timesheet for this week?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTimesheetAction({ driverId: row.driverId, weekStart });
      router.refresh();
    } catch {
      window.alert("Could not delete this timesheet. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${row.driverName}`}
            />
          }
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDeleteTimesheet}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {isDeleting ? "Deleting…" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DriverTimesheetDetailDialog
        row={row}
        weekStart={weekStart}
        drivers={drivers}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

interface DriverSubmissionsTableProps {
  rows: DriverSubmissionRow[];
  weekStart: string;
  drivers: Driver[];
}

export function DriverSubmissionsTable({
  rows,
  weekStart,
  drivers,
}: DriverSubmissionsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No driver submissions match the current filters.
      </p>
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
            This week
          </TableHead>
          <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Last submitted
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
          <TableRow key={row.driverId}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {getInitials(row.driverName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{row.driverName}</p>
                  <p className="text-xs text-muted-foreground">{row.roleType}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>{row.hoursLogged} hrs</TableCell>
            <TableCell>{formatLastSubmitted(row.lastSubmittedAt)}</TableCell>
            <TableCell>
              <StatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              <RowActions row={row} weekStart={weekStart} drivers={drivers} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
