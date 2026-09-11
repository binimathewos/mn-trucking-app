export type DriverStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";

export interface DriverDirectoryFilters {
  status?: DriverStatus;
  search?: string;
}

export interface DriverRow {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string | null;
  driverClass: string;
  truckNumber: string | null;
  status: DriverStatus;
  lastActivity: string | null;
}

export interface DriverDirectoryStats {
  totalDrivers: number;
  activeToday: number;
  onLeave: number;
}

export interface DriverDirectoryResult {
  stats: DriverDirectoryStats;
  drivers: DriverRow[];
}

/**
 * Thrown by driver actions/lib helpers for a failure the caller should show
 * directly to the administrator. `fieldErrors` lets a dialog highlight the
 * specific offending input (e.g. a Clerk duplicate-email rejection mapped to
 * the `email` field) instead of only showing a generic message.
 *
 * Next.js Server Actions only forward a thrown Error's `message` string
 * across the client/server boundary — custom instance properties like
 * `fieldErrors` do not survive serialization to the browser. When field
 * errors are present, this JSON-encodes both into `message` so a dialog's
 * catch block (via `parseDriverActionError`) can recover them; server-side
 * code (including this feature's own tests, which call these functions
 * in-process) can still read `.fieldErrors` directly.
 */
export class DriverActionError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    const hasFieldErrors = fieldErrors && Object.keys(fieldErrors).length > 0;
    super(hasFieldErrors ? JSON.stringify({ message, fieldErrors }) : message);
    this.name = "DriverActionError";
    this.fieldErrors = fieldErrors;
  }
}

/** Client-side counterpart to `DriverActionError` — see its doc comment. */
export function parseDriverActionError(error: unknown): {
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
