import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/features/clients/types";

const STATUS_LABEL: Record<ClientStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

const STATUS_CLASSNAME: Record<ClientStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-600",
};

interface ClientStatusBadgeProps {
  status: ClientStatus;
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
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
