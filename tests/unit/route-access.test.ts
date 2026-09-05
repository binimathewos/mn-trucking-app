import { describe, expect, it } from "vitest";
import {
  resolveAdminOnlyAccess,
  resolveDashboardAccess,
} from "@/lib/auth/route-access";

describe("resolveDashboardAccess", () => {
  it("redirects to sign-in when signed out", () => {
    expect(resolveDashboardAccess({ isSignedIn: false })).toEqual({
      outcome: "redirect",
      destination: "sign-in",
    });
  });

  it("renders for a signed-in administrator", () => {
    expect(
      resolveDashboardAccess({ isSignedIn: true }),
    ).toEqual({ outcome: "render" });
  });

  it("renders for a signed-in driver", () => {
    expect(
      resolveDashboardAccess({ isSignedIn: true }),
    ).toEqual({ outcome: "render" });
  });
});

describe("resolveAdminOnlyAccess", () => {
  it("redirects to sign-in when signed out", () => {
    expect(resolveAdminOnlyAccess({ isSignedIn: false })).toEqual({
      outcome: "redirect",
      destination: "sign-in",
    });
  });

  it("renders for a signed-in administrator", () => {
    expect(
      resolveAdminOnlyAccess({ isSignedIn: true, role: "administrator" }),
    ).toEqual({ outcome: "render" });
  });

  it("redirects a signed-in driver to the dashboard", () => {
    expect(
      resolveAdminOnlyAccess({ isSignedIn: true, role: "driver" }),
    ).toEqual({ outcome: "redirect", destination: "dashboard" });
  });

  it("fails closed for a signed-in user with an unrecognized or missing role", () => {
    expect(
      resolveAdminOnlyAccess({
        isSignedIn: true,
        role: "manager" as unknown as "administrator" | "driver",
      }),
    ).toEqual({ outcome: "redirect", destination: "dashboard" });

    expect(resolveAdminOnlyAccess({ isSignedIn: true })).toEqual({
      outcome: "redirect",
      destination: "dashboard",
    });
  });
});
