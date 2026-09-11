export type RouteStatus = "SCHEDULED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface RouteDirectoryFilters {
  status?: RouteStatus;
  driverId?: string | "UNASSIGNED";
  clientId?: string;
  pickupDateFrom?: string;
  pickupDateTo?: string;
  search?: string;
}

export interface RouteRow {
  id: string;
  routeNumber: string;
  clientId: string;
  clientName: string;
  driverId: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  pickupAt: string;
  deliveryAt: string | null;
  driverName: string | null;
  truckNumber: string | null;
  referenceNumber: string | null;
  notes: string | null;
  status: RouteStatus;
}

/**
 * Thrown by route actions/lib helpers for a failure the caller should show
 * directly to the administrator. Same JSON-encoded-`fieldErrors` pattern as
 * `DriverActionError` (see its doc comment in `src/features/drivers/types.ts`)
 * — Server Actions only forward a thrown Error's `message` string across the
 * client/server boundary, so field errors are JSON-encoded into `message` and
 * recovered client-side via `parseRouteActionError`.
 */
export class RouteActionError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    const hasFieldErrors = fieldErrors && Object.keys(fieldErrors).length > 0;
    super(hasFieldErrors ? JSON.stringify({ message, fieldErrors }) : message);
    this.name = "RouteActionError";
    this.fieldErrors = fieldErrors;
  }
}

/** Client-side counterpart to `RouteActionError` — see its doc comment. */
export function parseRouteActionError(error: unknown): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const fallback = "Something went wrong. Please try again.";
  if (!(error instanceof Error)) {
    return { message: fallback, fieldErrors: {} };
  }

  try {
    const parsed = JSON.parse(error.message) as {
      message?: string;
      fieldErrors?: Record<string, string>;
    };
    if (parsed && typeof parsed.message === "string") {
      return { message: parsed.message, fieldErrors: parsed.fieldErrors ?? {} };
    }
  } catch {
    // Not JSON — a plain message (e.g. the "Not authorized..." guard error).
  }

  return { message: error.message || fallback, fieldErrors: {} };
}
