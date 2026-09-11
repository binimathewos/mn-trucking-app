import { describe, expect, it, vi } from "vitest";

const getSessionAccess = vi.fn();

vi.mock("@/lib/auth/get-session-access", () => ({ getSessionAccess }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    driverPaySettings: { upsert: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateDefaultHourlyRateAction } = await import(
  "@/features/settings/actions/driver-pay-settings-actions"
);
const { prisma } = await import("@/lib/db/prisma");

const NON_ADMIN_SESSIONS = [
  { isSignedIn: false, role: undefined },
  { isSignedIn: true, role: "driver" },
] as const;

describe("updateDefaultHourlyRateAction authorization", () => {
  for (const session of NON_ADMIN_SESSIONS) {
    it(`rejects session: ${JSON.stringify(session)}`, async () => {
      getSessionAccess.mockResolvedValueOnce(session);

      await expect(updateDefaultHourlyRateAction({ defaultHourlyRate: "22.00" })).rejects.toThrow(
        /not authorized/i,
      );
      expect(prisma.driverPaySettings.upsert).not.toHaveBeenCalled();
    });
  }

  it("allows an administrator", async () => {
    getSessionAccess.mockResolvedValueOnce({ isSignedIn: true, role: "administrator" });

    await updateDefaultHourlyRateAction({ defaultHourlyRate: "22.00" });

    expect(prisma.driverPaySettings.upsert).toHaveBeenCalled();
  });
});
