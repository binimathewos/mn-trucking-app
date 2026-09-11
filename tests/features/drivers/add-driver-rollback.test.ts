import { describe, expect, it, vi } from "vitest";

const getSessionAccess = vi.fn(async () => ({ isSignedIn: true, role: "administrator" }));
const findFirst = vi.fn(async () => null);
const $transaction = vi.fn();
const createUser = vi.fn(async () => ({ id: "user_new" }));
const deleteUser = vi.fn(async () => ({}));

vi.mock("@/lib/auth/get-session-access", () => ({ getSessionAccess }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    driver: { findFirst },
    $transaction,
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({ users: { createUser, deleteUser } })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { addDriverAction } = await import("@/features/drivers/actions/driver-actions");

const VALID_INPUT = {
  fullName: "Alex Morgan",
  email: "alex@mntrucking.com",
  temporaryPassword: "correct-horse-battery-staple",
};

describe("addDriverAction rollback", () => {
  it("deletes the just-created Clerk user when the post-Clerk transaction fails", async () => {
    $transaction.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(addDriverAction(VALID_INPUT)).rejects.toThrow(/could not save the driver profile/i);

    expect(createUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith("user_new");
  });

  it("surfaces a manual-cleanup-needed error when the compensating delete itself fails", async () => {
    $transaction.mockRejectedValueOnce(new Error("db unavailable"));
    deleteUser.mockRejectedValueOnce(new Error("clerk unavailable"));

    await expect(addDriverAction(VALID_INPUT)).rejects.toThrow(/manual cleanup/i);
  });
});
