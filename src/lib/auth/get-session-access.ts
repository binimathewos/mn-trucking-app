import { auth, currentUser } from "@clerk/nextjs/server";
import type { SessionRole } from "@/lib/auth/route-access";

/**
 * Clerk stores the role as "admin", not our domain's "administrator" —
 * translate at this one boundary so the rest of the app deals only in
 * the domain's role type.
 */
function normalizeRole(rawRole: unknown): SessionRole | undefined {
  if (rawRole === "admin") {
    return "administrator";
  }
  if (rawRole === "driver") {
    return "driver";
  }
  return undefined;
}

export async function getSessionAccess() {
  const { userId, redirectToSignIn } = await auth();
  const user = userId ? await currentUser() : null;
  const role = normalizeRole(user?.publicMetadata.role);

  return { isSignedIn: Boolean(userId), role, user, redirectToSignIn };
}
