import { describe, expect, it, vi, beforeEach } from "vitest";

const getSessionAccess = vi.fn();

vi.mock("@/lib/auth/get-session-access", () => ({ getSessionAccess }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    route: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { setRouteStatusAction, cancelRouteAction } = await import(
  "@/features/routes/actions/route-actions"
);
const { prisma } = await import("@/lib/db/prisma");

function route(status: string) {
  return { id: "route_1", status };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSessionAccess.mockResolvedValue({ isSignedIn: true, role: "administrator" });
});

describe("setRouteStatusAction", () => {
  it.each(["SCHEDULED", "ASSIGNED", "IN_PROGRESS"])(
    "allows moving freely to %s regardless of current non-final status",
    async (target) => {
      vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route("IN_PROGRESS") as never);

      await setRouteStatusAction({ routeId: "route_1", status: target });

      expect(prisma.route.update).toHaveBeenCalledWith({
        where: { id: "route_1" },
        data: { status: target },
      });
    },
  );

  it("allows moving 'backward' from IN_PROGRESS to SCHEDULED", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route("IN_PROGRESS") as never);

    await setRouteStatusAction({ routeId: "route_1", status: "SCHEDULED" });

    expect(prisma.route.update).toHaveBeenCalledWith({
      where: { id: "route_1" },
      data: { status: "SCHEDULED" },
    });
  });

  it.each(["COMPLETED", "CANCELLED"])("rejects when the route is already %s", async (status) => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route(status) as never);

    await expect(setRouteStatusAction({ routeId: "route_1", status: "IN_PROGRESS" })).rejects.toThrow(
      /completed or cancelled/i,
    );
    expect(prisma.route.update).not.toHaveBeenCalled();
  });
});

describe("cancelRouteAction", () => {
  it("sets CANCELLED without deleting the row", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route("SCHEDULED") as never);

    await cancelRouteAction({ routeId: "route_1" });

    expect(prisma.route.update).toHaveBeenCalledWith({
      where: { id: "route_1" },
      data: { status: "CANCELLED" },
    });
  });

  it("rejects when the route is already final", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValueOnce(route("CANCELLED") as never);

    await expect(cancelRouteAction({ routeId: "route_1" })).rejects.toThrow(/completed or cancelled/i);
  });
});
