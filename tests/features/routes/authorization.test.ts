import { describe, expect, it, vi } from "vitest";

const getSessionAccess = vi.fn();

vi.mock("@/lib/auth/get-session-access", () => ({ getSessionAccess }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    route: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    client: { findUnique: vi.fn() },
    driver: { findUnique: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  createRouteAction,
  updateRouteAction,
  assignDriverAction,
  unassignDriverAction,
  setRouteStatusAction,
  cancelRouteAction,
} = await import("@/features/routes/actions/route-actions");
const { addClientAction, updateClientAction, setClientStatusAction } = await import(
  "@/features/clients/actions/client-actions"
);
const { getRouteById, getMyRoutes } = await import("@/features/routes/data/route-repository");
const { prisma } = await import("@/lib/db/prisma");

const NON_ADMIN_SESSIONS = [
  { isSignedIn: false, role: undefined },
  { isSignedIn: true, role: "driver" },
] as const;

describe("route/client action authorization", () => {
  for (const session of NON_ADMIN_SESSIONS) {
    describe(`session: ${JSON.stringify(session)}`, () => {
      it("createRouteAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          createRouteAction({
            clientId: "client_1",
            pickupAddress: "A",
            deliveryAddress: "B",
            pickupAt: "2026-01-01",
            role: "administrator",
          }),
        ).rejects.toThrow(/not authorized/i);
      });

      it("updateRouteAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          updateRouteAction({
            routeId: "route_1",
            clientId: "client_1",
            pickupAddress: "A",
            deliveryAddress: "B",
            pickupAt: "2026-01-01",
          }),
        ).rejects.toThrow(/not authorized/i);
      });

      it("assignDriverAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          assignDriverAction({ routeId: "route_1", driverId: "driver_1" }),
        ).rejects.toThrow(/not authorized/i);
      });

      it("unassignDriverAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(unassignDriverAction({ routeId: "route_1" })).rejects.toThrow(/not authorized/i);
      });

      it("setRouteStatusAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          setRouteStatusAction({ routeId: "route_1", status: "IN_PROGRESS" }),
        ).rejects.toThrow(/not authorized/i);
      });

      it("cancelRouteAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(cancelRouteAction({ routeId: "route_1" })).rejects.toThrow(/not authorized/i);
      });

      it("addClientAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          addClientAction({
            companyName: "Acme",
            contactName: "Jamie",
            phone: "6125550100",
            email: "j@acme.com",
            address: "123 Main St",
          }),
        ).rejects.toThrow(/not authorized/i);
      });

      it("updateClientAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          updateClientAction({
            clientId: "client_1",
            companyName: "Acme",
            contactName: "Jamie",
            phone: "6125550100",
            email: "j@acme.com",
            address: "123 Main St",
          }),
        ).rejects.toThrow(/not authorized/i);
      });

      it("setClientStatusAction rejects", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          setClientStatusAction({ clientId: "client_1", status: "INACTIVE" }),
        ).rejects.toThrow(/not authorized/i);
      });
    });
  }
});

function routeWithRelations(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "route_1",
    sequenceNumber: 1,
    clientId: "client_1",
    client: { companyName: "Acme Co" },
    driverId: "driver_owner",
    driver: { truckNumber: "Truck 1", user: { name: "Marcus Johnson" } },
    pickupAddress: "A",
    deliveryAddress: "B",
    pickupAt: new Date("2026-01-01T08:00:00Z"),
    deliveryAt: null,
    referenceNumber: null,
    notes: null,
    status: "ASSIGNED",
    hourlyRate: 25,
    ...overrides,
  };
}

describe("driver-scoped route visibility", () => {
  it("getRouteById returns null for a route not owned by the requesting driver", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(routeWithRelations() as never);

    const result = await getRouteById("route_1", { role: "driver", driverId: "someone_else" });

    expect(result).toBeNull();
  });

  it("getRouteById returns the route when owned by the requesting driver", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(routeWithRelations() as never);

    const result = await getRouteById("route_1", { role: "driver", driverId: "driver_owner" });

    expect(result?.id).toBe("route_1");
  });

  it("getMyRoutes queries scoped to the given driverId", async () => {
    vi.mocked(prisma.route.findMany).mockResolvedValueOnce([]);

    await getMyRoutes("driver_owner");

    expect(prisma.route.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { driverId: "driver_owner" } }),
    );
  });
});
