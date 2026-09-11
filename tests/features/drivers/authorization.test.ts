import { describe, expect, it, vi } from "vitest";

const getSessionAccess = vi.fn();

vi.mock("@/lib/auth/get-session-access", () => ({
  getSessionAccess,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    driver: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    user: { create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: { createUser: vi.fn(), deleteUser: vi.fn(), banUser: vi.fn(), unbanUser: vi.fn() },
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { addDriverAction, updateDriverAction, setDriverStatusAction } = await import(
  "@/features/drivers/actions/driver-actions"
);

const NON_ADMIN_SESSIONS = [
  { isSignedIn: false, role: undefined },
  { isSignedIn: true, role: "driver" },
] as const;

describe("driver action authorization", () => {
  for (const session of NON_ADMIN_SESSIONS) {
    describe(`session: ${JSON.stringify(session)}`, () => {
      it("addDriverAction rejects, even with a role field in the payload", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          addDriverAction({
            fullName: "Alex Morgan",
            email: "alex@mntrucking.com",
            temporaryPassword: "correct-horse",
            role: "administrator",
          }),
        ).rejects.toThrow(/not authorized/i);
      });

      it("updateDriverAction rejects, even with a role field in the payload", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          updateDriverAction({
            driverId: "driver_1",
            fullName: "Alex Morgan",
            status: "ACTIVE",
            role: "administrator",
          }),
        ).rejects.toThrow(/not authorized/i);
      });

      it("setDriverStatusAction rejects, even with a role field in the payload", async () => {
        getSessionAccess.mockResolvedValueOnce(session);
        await expect(
          setDriverStatusAction({ driverId: "driver_1", status: "INACTIVE", role: "administrator" }),
        ).rejects.toThrow(/not authorized/i);
      });
    });
  }
});
