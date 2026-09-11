import { describe, expect, it, vi, beforeEach } from "vitest";

const getSessionAccess = vi.fn();

vi.mock("@/lib/auth/get-session-access", () => ({ getSessionAccess }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    route: { findUnique: vi.fn(), update: vi.fn() },
    client: { findUnique: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateRouteAction } = await import("@/features/routes/actions/route-actions");
const { prisma } = await import("@/lib/db/prisma");

const VALID_INPUT = {
  routeId: "route_1",
  clientId: "client_1",
  pickupAddress: "123 A St",
  deliveryAddress: "456 B St",
  pickupAt: "2026-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  getSessionAccess.mockResolvedValue({ isSignedIn: true, role: "administrator" });
});

describe("updateRouteAction", () => {
  it("rejects when the target route is already COMPLETED", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce({
      id: "route_1",
      status: "COMPLETED",
    } as never);

    await expect(updateRouteAction(VALID_INPUT)).rejects.toThrow(/completed or cancelled/i);
    expect(prisma.route.update).not.toHaveBeenCalled();
  });

  it("rejects when the target route is already CANCELLED", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce({
      id: "route_1",
      status: "CANCELLED",
    } as never);

    await expect(updateRouteAction(VALID_INPUT)).rejects.toThrow(/completed or cancelled/i);
  });

  it("rejects when the referenced client is not ACTIVE", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce({
      id: "route_1",
      status: "SCHEDULED",
    } as never);
    vi.mocked(prisma.client.findUnique).mockResolvedValueOnce({
      id: "client_1",
      status: "INACTIVE",
    } as never);

    await expect(updateRouteAction(VALID_INPUT)).rejects.toThrow(/errors/i);
    expect(prisma.route.update).not.toHaveBeenCalled();
  });

  it("updates the route when the route is non-final and the client is active", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce({
      id: "route_1",
      status: "SCHEDULED",
    } as never);
    vi.mocked(prisma.client.findUnique).mockResolvedValueOnce({
      id: "client_1",
      status: "ACTIVE",
    } as never);

    await updateRouteAction(VALID_INPUT);

    expect(prisma.route.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "route_1" } }),
    );
  });
});
