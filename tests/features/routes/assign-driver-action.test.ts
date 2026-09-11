import { describe, expect, it, vi, beforeEach } from "vitest";

const getSessionAccess = vi.fn();

vi.mock("@/lib/auth/get-session-access", () => ({ getSessionAccess }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    route: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    driver: { findUnique: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { assignDriverAction, unassignDriverAction } = await import(
  "@/features/routes/actions/route-actions"
);
const { prisma } = await import("@/lib/db/prisma");

function route(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "route_1",
    status: "SCHEDULED",
    driverId: null,
    pickupAt: new Date("2026-01-01T08:00:00Z"),
    deliveryAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionAccess.mockResolvedValue({ isSignedIn: true, role: "administrator" });
});

describe("assignDriverAction", () => {
  it("rejects an inactive driver", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route() as never);
    vi.mocked(prisma.driver.findUnique).mockResolvedValueOnce({
      id: "driver_1",
      status: "INACTIVE",
    } as never);

    await expect(assignDriverAction({ routeId: "route_1", driverId: "driver_1" })).rejects.toThrow(
      /errors/i,
    );
    expect(prisma.route.update).not.toHaveBeenCalled();
  });

  it("rejects a conflicting overlapping route", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(
      route({ deliveryAt: new Date("2026-01-01T12:00:00Z") }) as never,
    );
    vi.mocked(prisma.driver.findUnique).mockResolvedValueOnce({
      id: "driver_1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.route.findMany).mockResolvedValueOnce([
      {
        id: "route_other",
        sequenceNumber: 5,
        client: { companyName: "Acme" },
        driverId: "driver_1",
        driver: { truckNumber: null, user: { name: "Sam" } },
        pickupAddress: "A",
        deliveryAddress: "B",
        pickupAt: new Date("2026-01-01T09:00:00Z"),
        deliveryAt: new Date("2026-01-01T13:00:00Z"),
        referenceNumber: null,
        notes: null,
        status: "SCHEDULED",
      },
    ] as never);

    await expect(assignDriverAction({ routeId: "route_1", driverId: "driver_1" })).rejects.toThrow(
      /already assigned/i,
    );
    expect(prisma.route.update).not.toHaveBeenCalled();
  });

  it("sets status ASSIGNED on success", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route() as never);
    vi.mocked(prisma.driver.findUnique).mockResolvedValueOnce({
      id: "driver_1",
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.route.findMany).mockResolvedValueOnce([]);

    await assignDriverAction({ routeId: "route_1", driverId: "driver_1" });

    expect(prisma.route.update).toHaveBeenCalledWith({
      where: { id: "route_1" },
      data: { driverId: "driver_1", status: "ASSIGNED" },
    });
  });

  it("rejects when the route is already final", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route({ status: "COMPLETED" }) as never);

    await expect(assignDriverAction({ routeId: "route_1", driverId: "driver_1" })).rejects.toThrow(
      /completed or cancelled/i,
    );
  });
});

describe("unassignDriverAction", () => {
  it("sets status SCHEDULED", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(
      route({ driverId: "driver_1", status: "ASSIGNED" }) as never,
    );

    await unassignDriverAction({ routeId: "route_1" });

    expect(prisma.route.update).toHaveBeenCalledWith({
      where: { id: "route_1" },
      data: { driverId: null, status: "SCHEDULED" },
    });
  });

  it("rejects when the route is already final", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route({ status: "CANCELLED" }) as never);

    await expect(unassignDriverAction({ routeId: "route_1" })).rejects.toThrow(/completed or cancelled/i);
  });
});
