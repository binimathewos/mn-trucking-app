import { cn } from "@/lib/utils";
import type { TimesheetStatus } from "@/features/timesheets/types";

const STATUS_LABEL: Record<TimesheetStatus, string> = {
  submitted: "Submitted",
  draft: "Draft",
  not_submitted: "Not Submitted",
};

const STATUS_CLASSNAME: Record<TimesheetStatus, string> = {
  submitted: "text-emerald-700",
  draft: "text-amber-700",
  not_submitted: "text-slate-600",
};

interface StatusBadgeProps {
  status: TimesheetStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={cn("text-sm font-medium", STATUS_CLASSNAME[status])}>{STATUS_LABEL[status]}</span>;
}
