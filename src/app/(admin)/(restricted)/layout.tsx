import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { resolveAdminOnlyAccess } from "@/lib/auth/route-access";

export default async function RestrictedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isSignedIn, role, redirectToSignIn } = await getSessionAccess();

  const access = resolveAdminOnlyAccess({ isSignedIn, role });

  if (access.outcome === "redirect") {
    if (access.destination === "sign-in") {
      return redirectToSignIn();
    }
    redirect("/dashboard");
  }

  return children;
}
