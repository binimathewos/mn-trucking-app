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
import type { DriverStatus } from "@/features/drivers/types";

const ALL_STATUS_VALUE = "__all__";

const STATUS_ITEMS: Record<string, string> = {
  [ALL_STATUS_VALUE]: "All drivers",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On leave",
};

interface DriverFiltersBarProps {
  currentStatus?: DriverStatus;
  currentSearch?: string;
}

export function DriverFiltersBar({ currentStatus, currentSearch }: DriverFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<DriverStatus | typeof ALL_STATUS_VALUE>(
    currentStatus ?? ALL_STATUS_VALUE,
  );
  const [search, setSearch] = useState(currentSearch ?? "");

  function applyFilters() {
    const params = new URLSearchParams();
    if (status !== ALL_STATUS_VALUE) {
      params.set("status", status);
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
          placeholder="Search drivers"
          className="w-full pl-8 sm:w-48"
        />
      </div>

      <Select
        items={STATUS_ITEMS}
        value={status}
        onValueChange={(value) => setStatus((value as DriverStatus) ?? ALL_STATUS_VALUE)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All drivers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUS_VALUE}>All drivers</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
          <SelectItem value="ON_LEAVE">On leave</SelectItem>
        </SelectContent>
      </Select>

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
