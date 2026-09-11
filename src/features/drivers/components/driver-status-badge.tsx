import { cn } from "@/lib/utils";
import type { DriverStatus } from "@/features/drivers/types";

const STATUS_LABEL: Record<DriverStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On leave",
};

const STATUS_CLASSNAME: Record<DriverStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  ON_LEAVE: "bg-amber-100 text-amber-700",
};

interface DriverStatusBadgeProps {
  status: DriverStatus;
}

export function DriverStatusBadge({ status }: DriverStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSNAME[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}
