"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpRight,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getContainerInventoryPreview } from "@/features/dashboard/data/mock-dashboard-data";
import { getStorageDurationDays } from "@/features/dashboard/lib/storage-duration";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ContainerInventoryCard() {
  const [searchText, setSearchText] = useState("");

  const preview = useMemo(
    () => getContainerInventoryPreview(searchText),
    [searchText],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">
            Container inventory
          </CardTitle>
          <CardDescription>
            Containers currently stored at your warehouse
          </CardDescription>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search containers"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="pl-8 sm:w-56"
              aria-label="Search containers"
            />
          </div>

          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  <ArrowDownToLine className="size-4" aria-hidden="true" />
                  Check in
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Check-in container</DialogTitle>
                <DialogDescription>
                  Add a container to the warehouse inventory. This preview does
                  not save changes.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                  Container number
                  <Input placeholder="e.g. MNKU-123456" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                  Customer
                  <Input placeholder="e.g. Northstar Logistics" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                  Location
                  <Input placeholder="e.g. Bay 04" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                  Checked-in date
                  <Input type="date" />
                </label>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">Cancel</Button>} />
                <DialogClose render={<Button>Check in container</Button>} />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {preview.totalCount === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No containers in inventory yet.
          </p>
        ) : preview.records.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No containers match &ldquo;{searchText}&rdquo;.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Container
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Location
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Received
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Storage
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
              {preview.records.map((record) => {
                const storageDurationDays = getStorageDurationDays(
                  record.receivedDate,
                  record.checkedOutDate,
                );

                return (
                  <TableRow key={record.id}>
                    <TableCell className="max-w-40 truncate font-medium whitespace-normal">
                      {record.containerNumber}
                    </TableCell>
                    <TableCell className="max-w-48 truncate whitespace-normal">
                      {record.customerName}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="size-1.5 rounded-full bg-blue-500"
                          aria-hidden="true"
                        />
                        {record.location}
                      </span>
                    </TableCell>
                    <TableCell>{dateFormatter.format(new Date(record.receivedDate))}</TableCell>
                    <TableCell>{storageDurationDays} days</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        <span
                          className="size-1.5 rounded-full bg-emerald-600"
                          aria-hidden="true"
                        />
                        {record.status === "in_warehouse"
                          ? "In Warehouse"
                          : "Checked Out"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for container ${record.containerNumber}`}
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem render={<Link href="/containers" />}>
                            View details
                          </DropdownMenuItem>
                          {record.status === "in_warehouse" ? (
                            <DropdownMenuItem>Check out</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>
                              View check-out record
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CardFooter className="justify-between bg-transparent">
        <p className="text-sm text-muted-foreground">
          Showing {preview.records.length} of {preview.totalCount} containers
        </p>
        <Button
          variant="link"
          nativeButton={false}
          render={<Link href="/containers" />}
        >
          View inventory
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
