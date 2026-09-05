import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TimesheetStatus } from "@/features/timesheets/types";

const STATUS_LABEL: Record<TimesheetStatus, string> = {
  submitted: "Submitted",
  draft: "Draft",
  not_submitted: "Not Submitted",
};

const STATUS_CLASSNAME: Record<TimesheetStatus, string> = {
  submitted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  not_submitted: "border-slate-200 bg-slate-100 text-slate-600",
};

const STATUS_DOT_CLASSNAME: Record<TimesheetStatus, string> = {
  submitted: "bg-emerald-600",
  draft: "bg-amber-600",
  not_submitted: "bg-slate-500",
};

interface StatusBadgeProps {
  status: TimesheetStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("w-28 gap-1.5", STATUS_CLASSNAME[status])}>
      <span className={cn("size-1.5 rounded-full", STATUS_DOT_CLASSNAME[status])} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
