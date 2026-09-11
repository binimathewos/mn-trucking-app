export type ClientStatus = "ACTIVE" | "INACTIVE";

export interface ClientRow {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  status: ClientStatus;
}

/** Same JSON-encoded-`fieldErrors` pattern as `DriverActionError` — see its doc comment. */
export class ClientActionError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    const hasFieldErrors = fieldErrors && Object.keys(fieldErrors).length > 0;
    super(hasFieldErrors ? JSON.stringify({ message, fieldErrors }) : message);
    this.name = "ClientActionError";
    this.fieldErrors = fieldErrors;
  }
}

/** Client-side counterpart to `ClientActionError` — see its doc comment. */
export function parseClientActionError(error: unknown): {
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
