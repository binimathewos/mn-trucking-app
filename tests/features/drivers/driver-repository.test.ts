import { describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const getUserList = vi.fn(
  async (): Promise<{ data: { id: string; lastSignInAt: number | null }[] }> => ({ data: [] }),
);

vi.mock("@/lib/db/prisma", () => ({
  prisma: { driver: { findMany } },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({ users: { getUserList } })),
}));

const { getDriverDirectory } = await import("@/features/drivers/data/driver-repository");

function driverRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "driver_1",
    roleType: "Class A Driver",
    phone: null,
    truckNumber: "MN-1",
    status: "ACTIVE",
    user: { name: "Marcus Johnson", email: "marcus@mntrucking.test", clerkUserId: "user_1" },
    ...overrides,
  };
}

describe("getDriverDirectory", () => {
  it("computes stats over the unfiltered set while drivers respects filters", async () => {
    findMany.mockResolvedValueOnce([
      driverRow({ id: "d1", status: "ACTIVE", user: { name: "Marcus Johnson", email: "m@x.com", clerkUserId: "u1" } }),
      driverRow({ id: "d2", status: "ON_LEAVE", user: { name: "Sam Wilson", email: "s@x.com", clerkUserId: "u2" } }),
      driverRow({ id: "d3", status: "INACTIVE", user: { name: "Elena Ruiz", email: "e@x.com", clerkUserId: "u3" } }),
    ]);

    const result = await getDriverDirectory({ status: "ACTIVE" });

    expect(result.stats).toEqual({ totalDrivers: 3, activeToday: 1, onLeave: 1 });
    expect(result.drivers).toHaveLength(1);
    expect(result.drivers[0]?.name).toBe("Marcus Johnson");
  });

  it("applies a case-insensitive name search without affecting stats", async () => {
    findMany.mockResolvedValueOnce([
      driverRow({ id: "d1", user: { name: "Marcus Johnson", email: "m@x.com", clerkUserId: "u1" } }),
      driverRow({ id: "d2", user: { name: "Sam Wilson", email: "s@x.com", clerkUserId: "u2" } }),
    ]);

    const result = await getDriverDirectory({ search: "marcus" });

    expect(result.stats.totalDrivers).toBe(2);
    expect(result.drivers).toHaveLength(1);
    expect(result.drivers[0]?.name).toBe("Marcus Johnson");
  });

  it("maps a null lastSignInAt to lastActivity: null", async () => {
    findMany.mockResolvedValueOnce([driverRow()]);
    getUserList.mockResolvedValueOnce({ data: [{ id: "user_1", lastSignInAt: null }] });

    const result = await getDriverDirectory();

    expect(result.drivers[0]?.lastActivity).toBeNull();
  });
});
