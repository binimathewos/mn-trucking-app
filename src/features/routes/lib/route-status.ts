import type { RouteStatus } from "@/features/routes/types";

/** `true` once a route reaches a terminal state — every field becomes immutable (FR-023). */
export function isFinalStatus(status: RouteStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

/**
 * The auto-synced status written by `assignDriverAction`/`unassignDriverAction`
 * (research.md #3, FR-017a). A subsequent manual override via
 * `setRouteStatusAction` is not "sticky" — the next assign/unassign still
 * overwrites `status` with this result, per the Clarifications session.
 */
export function autoStatusForDriverPresence(hasDriver: boolean): "ASSIGNED" | "SCHEDULED" {
  return hasDriver ? "ASSIGNED" : "SCHEDULED";
}
