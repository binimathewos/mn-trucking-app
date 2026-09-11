import { describe, expect, it, vi, beforeEach } from "vitest";

const findMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: { route: { findMany } },
}));

const { findConflictingRoute } = await import("@/features/routes/lib/driver-conflict");

function routeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "route_existing",
    sequenceNumber: 7,
    clientId: "client_1",
    client: { companyName: "Acme Co" },
    driverId: "driver_1",
    driver: { truckNumber: "Truck 1", user: { name: "Marcus Johnson" } },
    pickupAddress: "123 A St",
    deliveryAddress: "456 B St",
    pickupAt: new Date("2026-01-01T08:00:00Z"),
    deliveryAt: new Date("2026-01-01T12:00:00Z"),
    referenceNumber: null,
    notes: null,
    status: "SCHEDULED",
    ...overrides,
  };
}

beforeEach(() => {
  findMany.mockReset();
});

describe("findConflictingRoute", () => {
  it("returns null immediately when the candidate has no deliveryAt", async () => {
    const result = await findConflictingRoute("driver_1", {
      pickupAt: new Date("2026-01-01T09:00:00Z"),
      deliveryAt: null,
    });

    expect(result).toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("flags an overlapping non-final route when both have deliveryAt set", async () => {
    findMany.mockResolvedValueOnce([routeRow()]);

    const result = await findConflictingRoute("driver_1", {
      pickupAt: new Date("2026-01-01T09:00:00Z"),
      deliveryAt: new Date("2026-01-01T13:00:00Z"),
    });

    expect(result?.id).toBe("route_existing");
    expect(result?.routeNumber).toBe("RT-000007");
  });

  it("allows non-overlapping windows", async () => {
    findMany.mockResolvedValueOnce([routeRow()]);

    const result = await findConflictingRoute("driver_1", {
      pickupAt: new Date("2026-01-01T13:00:00Z"),
      deliveryAt: new Date("2026-01-01T15:00:00Z"),
    });

    expect(result).toBeNull();
  });

  it("queries excluding COMPLETED/CANCELLED routes and rows without deliveryAt", async () => {
    findMany.mockResolvedValueOnce([]);

    await findConflictingRoute("driver_1", {
      pickupAt: new Date("2026-01-01T09:00:00Z"),
      deliveryAt: new Date("2026-01-01T13:00:00Z"),
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          deliveryAt: { not: null },
        }),
      }),
    );
  });

  it("excludes the given excludeRouteId", async () => {
    findMany.mockResolvedValueOnce([]);

    await findConflictingRoute(
      "driver_1",
      { pickupAt: new Date("2026-01-01T09:00:00Z"), deliveryAt: new Date("2026-01-01T13:00:00Z") },
      "route_self",
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "route_self" } }),
      }),
    );
  });
});
