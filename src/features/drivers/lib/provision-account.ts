import { clerkClient } from "@clerk/nextjs/server";
import { DriverActionError } from "@/features/drivers/types";

interface ProvisionDriverAccountInput {
  email: string;
  password: string;
  name: string;
}

interface ProvisionDriverAccountResult {
  clerkUserId: string;
}

interface ClerkFormError {
  code?: string;
  message?: string;
  longMessage?: string;
  meta?: { paramName?: string };
}

function isClerkFormErrorResponse(error: unknown): error is { errors: ClerkFormError[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors: unknown }).errors)
  );
}

function toProvisionError(error: unknown): DriverActionError {
  if (isClerkFormErrorResponse(error)) {
    const first = error.errors[0];
    const paramName = first?.meta?.paramName;
    const message = first?.longMessage ?? first?.message ?? "Could not create the driver's account.";

    if (paramName === "email_address" || first?.code === "form_identifier_exists") {
      return new DriverActionError("An account with this email already exists.", {
        email: "An account with this email already exists.",
      });
    }

    if (paramName === "password" || first?.code?.startsWith("form_password")) {
      return new DriverActionError(message, { temporaryPassword: message });
    }

    return new DriverActionError(message);
  }

  return new DriverActionError("Could not create the driver's account.");
}

function splitName(name: string): { firstName: string; lastName?: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? name.trim() };
  }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

/**
 * The single swappable boundary for FR-033: everything else only ever
 * depends on this function's `{ clerkUserId }` return shape, not on how the
 * account was created. Swapping to an invitation-based flow later means
 * changing only this function's body (research.md #5).
 */
export async function provisionDriverAccount(
  input: ProvisionDriverAccountInput,
): Promise<ProvisionDriverAccountResult> {
  const { firstName, lastName } = splitName(input.name);
  const client = await clerkClient();

  try {
    const user = await client.users.createUser({
      emailAddress: [input.email],
      password: input.password,
      firstName,
      lastName,
      publicMetadata: { role: "driver" },
    });

    return { clerkUserId: user.id };
  } catch (error) {
    throw toProvisionError(error);
  }
}
