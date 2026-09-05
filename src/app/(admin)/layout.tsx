import type { ReactNode } from "react";
import { Sidebar } from "@/components/app-shell/sidebar";
import { TopNav } from "@/components/app-shell/top-nav";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { resolveDashboardAccess } from "@/lib/auth/route-access";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isSignedIn, role, user, redirectToSignIn } = await getSessionAccess();

  const access = resolveDashboardAccess({ isSignedIn });

  if (access.outcome === "redirect") {
    return redirectToSignIn();
  }

  const effectiveRole = role === "administrator" ? "administrator" : "driver";
  const fullName =
    user!.fullName ?? (effectiveRole === "administrator" ? "Administrator" : "Driver");
  const initials = getInitials(fullName);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 md:flex-row">
      <Sidebar user={{ fullName, role: effectiveRole, initials }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav user={{ initials }} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
