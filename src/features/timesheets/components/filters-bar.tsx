"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Driver, WeekOption } from "@/features/timesheets/types";

const ALL_DRIVERS_VALUE = "__all__";

interface FiltersBarProps {
  drivers: Driver[];
  weekOptions: WeekOption[];
  currentDriverId?: string;
  currentWeek: string;
}

export function FiltersBar({
  drivers,
  weekOptions,
  currentDriverId,
  currentWeek,
}: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [driverId, setDriverId] = useState(currentDriverId ?? ALL_DRIVERS_VALUE);
  const [week, setWeek] = useState(currentWeek);

  // base-ui's <Select.Value> only shows the selected item's label (instead of
  // its raw value) when the root is given this explicit value→label map.
  const driverItems: Record<string, string> = {
    [ALL_DRIVERS_VALUE]: "All drivers",
    ...Object.fromEntries(drivers.map((driver) => [driver.id, driver.name])),
  };
  const weekItems: Record<string, string> = Object.fromEntries(
    weekOptions.map((option) => [option.value, option.label]),
  );

  function applyFilters() {
    const params = new URLSearchParams();
    if (driverId !== ALL_DRIVERS_VALUE) {
      params.set("driverId", driverId);
    }
    params.set("week", week);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={driverItems}
        value={driverId}
        onValueChange={(value) => setDriverId(value ?? ALL_DRIVERS_VALUE)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All drivers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_DRIVERS_VALUE}>All drivers</SelectItem>
          {drivers.map((driver) => (
            <SelectItem key={driver.id} value={driver.id}>
              {driver.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={weekItems}
        value={week}
        onValueChange={(value) => setWeek(value ?? currentWeek)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Select week" />
        </SelectTrigger>
        <SelectContent>
          {weekOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
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
