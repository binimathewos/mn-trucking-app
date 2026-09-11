import { describe, expect, it, vi, beforeEach } from "vitest";

const findMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: { route: { findMany } },
}));

const { getRouteDirectory } = await import("@/features/routes/data/route-repository");

function routeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "route_1",
    sequenceNumber: 42,
    clientId: "client_1",
    client: { companyName: "Acme Co" },
    driverId: "driver_1",
    driver: { truckNumber: "Truck 12", user: { name: "Marcus Johnson" } },
    pickupAddress: "123 A St",
    deliveryAddress: "456 B St",
    pickupAt: new Date("2026-01-01T08:00:00Z"),
    deliveryAt: new Date("2026-01-01T12:00:00Z"),
    referenceNumber: "PO-1",
    notes: null,
    status: "ASSIGNED",
    ...overrides,
  };
}

beforeEach(() => {
  findMany.mockReset();
});

describe("getRouteDirectory", () => {
  it("maps Route rows to RouteRow with formatted route number and derived truck", async () => {
    findMany.mockResolvedValueOnce([routeRow()]);

    const [row] = await getRouteDirectory();

    expect(row?.routeNumber).toBe("RT-000042");
    expect(row?.truckNumber).toBe("Truck 12");
    expect(row?.driverName).toBe("Marcus Johnson");
  });

  it("derives a null truck for an unassigned route", async () => {
    findMany.mockResolvedValueOnce([routeRow({ driverId: null, driver: null })]);

    const [row] = await getRouteDirectory();

    expect(row?.truckNumber).toBeNull();
    expect(row?.driverName).toBeNull();
  });

  it("applies a status filter", async () => {
    findMany.mockResolvedValueOnce([]);

    await getRouteDirectory({ status: "COMPLETED" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "COMPLETED" }) }),
    );
  });

  it("maps a driverId of 'UNASSIGNED' to driverId: null in the query", async () => {
    findMany.mockResolvedValueOnce([]);

    await getRouteDirectory({ driverId: "UNASSIGNED" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ driverId: null }) }),
    );
  });

  it("applies a clientId filter", async () => {
    findMany.mockResolvedValueOnce([]);

    await getRouteDirectory({ clientId: "client_9" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientId: "client_9" }) }),
    );
  });

  it("applies pickupDateFrom/pickupDateTo filters", async () => {
    findMany.mockResolvedValueOnce([]);

    await getRouteDirectory({ pickupDateFrom: "2026-01-01", pickupDateTo: "2026-01-31" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pickupAt: { gte: new Date("2026-01-01"), lte: new Date("2026-01-31") },
        }),
      }),
    );
  });

  it("narrows by search against route number, client name, and reference number", async () => {
    findMany.mockResolvedValueOnce([
      routeRow({ id: "r1", sequenceNumber: 1, client: { companyName: "Acme Co" }, referenceNumber: null }),
      routeRow({ id: "r2", sequenceNumber: 2, client: { companyName: "Beta LLC" }, referenceNumber: "PO-999" }),
      routeRow({ id: "r3", sequenceNumber: 3, client: { companyName: "Gamma" }, referenceNumber: null }),
    ]);

    const byRouteNumber = await getRouteDirectory({ search: "RT-000001" });
    expect(byRouteNumber.map((r) => r.id)).toEqual(["r1"]);

    findMany.mockResolvedValueOnce([
      routeRow({ id: "r1", sequenceNumber: 1, client: { companyName: "Acme Co" } }),
      routeRow({ id: "r2", sequenceNumber: 2, client: { companyName: "Beta LLC" } }),
    ]);
    const byClientName = await getRouteDirectory({ search: "beta" });
    expect(byClientName.map((r) => r.id)).toEqual(["r2"]);

    findMany.mockResolvedValueOnce([
      routeRow({ id: "r1", sequenceNumber: 1, referenceNumber: null }),
      routeRow({ id: "r2", sequenceNumber: 2, referenceNumber: "PO-999" }),
    ]);
    const byReference = await getRouteDirectory({ search: "po-999" });
    expect(byReference.map((r) => r.id)).toEqual(["r2"]);
  });
});
