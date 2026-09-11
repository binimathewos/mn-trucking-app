import { cn } from "@/lib/utils";
import type { RouteStatus } from "@/features/routes/types";

const STATUS_LABEL: Record<RouteStatus, string> = {
  SCHEDULED: "Scheduled",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_CLASSNAME: Record<RouteStatus, string> = {
  SCHEDULED: "bg-slate-100 text-slate-600",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface RouteStatusBadgeProps {
  status: RouteStatus;
}

export function RouteStatusBadge({ status }: RouteStatusBadgeProps) {
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
