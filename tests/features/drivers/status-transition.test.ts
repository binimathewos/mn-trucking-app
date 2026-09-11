import { describe, expect, it, vi } from "vitest";

const update = vi.fn(async () => ({}));
const banUser = vi.fn(async () => ({}));
const unbanUser = vi.fn(async () => ({}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { driver: { update } },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({ users: { banUser, unbanUser } })),
}));

const { applyDeactivation, applyReactivation } = await import(
  "@/features/drivers/lib/status-transition"
);

const DRIVER = { id: "driver_1", clerkUserId: "user_1" };

describe("applyDeactivation", () => {
  it("clears truckNumber, sets status INACTIVE, and calls banUser", async () => {
    await applyDeactivation(DRIVER);

    expect(update).toHaveBeenCalledWith({
      where: { id: "driver_1" },
      data: { status: "INACTIVE", truckNumber: null },
    });
    expect(banUser).toHaveBeenCalledWith("user_1");
  });
});

describe("applyReactivation", () => {
  it("sets status ACTIVE, calls unbanUser, and leaves truckNumber untouched", async () => {
    await applyReactivation(DRIVER);

    expect(update).toHaveBeenCalledWith({
      where: { id: "driver_1" },
      data: { status: "ACTIVE" },
    });
    expect(unbanUser).toHaveBeenCalledWith("user_1");
  });
});
