export type SessionRole = "administrator" | "driver";

export interface SessionAccessInput {
  isSignedIn: boolean;
  role?: SessionRole;
}

export type DashboardAccessResult =
  | { outcome: "render" }
  | { outcome: "redirect"; destination: "sign-in" };

export function resolveDashboardAccess(
  session: Pick<SessionAccessInput, "isSignedIn">,
): DashboardAccessResult {
  if (!session.isSignedIn) {
    return { outcome: "redirect", destination: "sign-in" };
  }

  return { outcome: "render" };
}

export type AdminOnlyAccessResult =
  | { outcome: "render" }
  | { outcome: "redirect"; destination: "sign-in" }
  | { outcome: "redirect"; destination: "dashboard" };

export function resolveAdminOnlyAccess(
  session: SessionAccessInput,
): AdminOnlyAccessResult {
  if (!session.isSignedIn) {
    return { outcome: "redirect", destination: "sign-in" };
  }

  if (session.role === "administrator") {
    return { outcome: "render" };
  }

  return { outcome: "redirect", destination: "dashboard" };
}
