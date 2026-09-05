import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveDashboardAccess } from "@/lib/auth/route-access";

const isAdminRoute = createRouteMatcher(["/dashboard(.*)", "/timesheets(.*)", "/containers(.*)", "/drivers(.*)", "/reports(.*)", "/settings(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isAdminRoute(req)) {
    return NextResponse.next();
  }

  const { userId, redirectToSignIn } = await auth();
  const access = resolveDashboardAccess({ isSignedIn: Boolean(userId) });

  if (access.outcome === "redirect") {
    return redirectToSignIn();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
