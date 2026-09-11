"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RouteStatus } from "@/features/routes/types";

const ALL_VALUE = "__all__";
const UNASSIGNED_VALUE = "UNASSIGNED";

const STATUS_ITEMS: Record<string, string> = {
  [ALL_VALUE]: "All statuses",
  SCHEDULED: "Scheduled",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

interface RouteFiltersBarProps {
  activeDrivers: { id: string; name: string }[];
  activeClients: { id: string; companyName: string }[];
  currentStatus?: RouteStatus;
  currentDriverId?: string;
  currentClientId?: string;
  currentPickupDateFrom?: string;
  currentPickupDateTo?: string;
  currentSearch?: string;
}

export function RouteFiltersBar({
  activeDrivers,
  activeClients,
  currentStatus,
  currentDriverId,
  currentClientId,
  currentPickupDateFrom,
  currentPickupDateTo,
  currentSearch,
}: RouteFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState(currentStatus ?? ALL_VALUE);
  const [driverId, setDriverId] = useState(currentDriverId ?? ALL_VALUE);
  const [clientId, setClientId] = useState(currentClientId ?? ALL_VALUE);
  const [pickupDateFrom, setPickupDateFrom] = useState(currentPickupDateFrom ?? "");
  const [pickupDateTo, setPickupDateTo] = useState(currentPickupDateTo ?? "");
  const [search, setSearch] = useState(currentSearch ?? "");

  const driverItems: Record<string, string> = {
    [ALL_VALUE]: "All drivers",
    [UNASSIGNED_VALUE]: "Unassigned",
    ...Object.fromEntries(activeDrivers.map((driver) => [driver.id, driver.name])),
  };
  const clientItems: Record<string, string> = {
    [ALL_VALUE]: "All clients",
    ...Object.fromEntries(activeClients.map((client) => [client.id, client.companyName])),
  };

  function applyFilters() {
    const params = new URLSearchParams();
    if (status !== ALL_VALUE) {
      params.set("status", status);
    }
    if (driverId !== ALL_VALUE) {
      params.set("driverId", driverId);
    }
    if (clientId !== ALL_VALUE) {
      params.set("clientId", clientId);
    }
    if (pickupDateFrom) {
      params.set("pickupDateFrom", pickupDateFrom);
    }
    if (pickupDateTo) {
      params.set("pickupDateTo", pickupDateTo);
    }
    if (search.trim()) {
      params.set("search", search.trim());
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applyFilters();
            }
          }}
          placeholder="Search routes"
          className="w-full pl-8 sm:w-48"
        />
      </div>

      <Select items={STATUS_ITEMS} value={status} onValueChange={(value) => setStatus(value ?? ALL_VALUE)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_ITEMS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={driverItems} value={driverId} onValueChange={(value) => setDriverId(value ?? ALL_VALUE)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All drivers" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(driverItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={clientItems} value={clientId} onValueChange={(value) => setClientId(value ?? ALL_VALUE)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All clients" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(clientItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={pickupDateFrom}
        onChange={(event) => setPickupDateFrom(event.target.value)}
        className="w-full sm:w-36"
        aria-label="Pickup date from"
      />
      <Input
        type="date"
        value={pickupDateTo}
        onChange={(event) => setPickupDateTo(event.target.value)}
        className="w-full sm:w-36"
        aria-label="Pickup date to"
      />

      <Button
        variant="outline"
        className="border-blue-200 text-blue-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        onClick={applyFilters}
      >
        <Filter className="size-4" aria-hidden="true" />
        Filter
      </Button>
    </div>
  );
}
