import { describe, expect, it } from "vitest";
import { getNavItemsForRole } from "@/components/app-shell/nav-items";

describe("getNavItemsForRole", () => {
  it("returns the full navigation for an administrator", () => {
    const labels = getNavItemsForRole("administrator").map(
      (item) => item.label,
    );

    expect(labels).toEqual([
      "Dashboard",
      "Timesheets",
      "Containers",
      "Drivers",
      "Reports",
      "Settings",
    ]);
  });

  it("returns only Dashboard for a driver", () => {
    const labels = getNavItemsForRole("driver").map((item) => item.label);

    expect(labels).toEqual(["Dashboard"]);
  });

  it("fails closed to the driver navigation for an unrecognized or missing role", () => {
    expect(
      getNavItemsForRole("manager" as unknown as "administrator" | "driver"),
    ).toEqual(getNavItemsForRole("driver"));

    expect(getNavItemsForRole(undefined)).toEqual(getNavItemsForRole("driver"));
  });
});
