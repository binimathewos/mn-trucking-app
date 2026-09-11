import { describe, expect, it, vi } from "vitest";

const createUser = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({ users: { createUser } })),
}));

const { provisionDriverAccount } = await import("@/features/drivers/lib/provision-account");

describe("provisionDriverAccount", () => {
  it("returns the new clerkUserId on success", async () => {
    createUser.mockResolvedValueOnce({ id: "user_123" });

    await expect(
      provisionDriverAccount({ email: "a@b.com", password: "correct-horse", name: "Alex Morgan" }),
    ).resolves.toEqual({ clerkUserId: "user_123" });
  });

  it("maps a duplicate-email rejection to a distinct, catchable field error", async () => {
    createUser.mockRejectedValueOnce({
      errors: [{ code: "form_identifier_exists", message: "already exists" }],
    });

    const error = await provisionDriverAccount({
      email: "taken@b.com",
      password: "correct-horse",
      name: "Alex Morgan",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as { fieldErrors?: Record<string, string> }).fieldErrors).toEqual({
      email: expect.stringMatching(/already exists/i),
    });
  });

  it("maps a weak-password rejection to a distinct, catchable field error", async () => {
    createUser.mockRejectedValueOnce({
      errors: [
        {
          code: "form_password_pwned",
          message: "Password has been found in an online data breach.",
          meta: { paramName: "password" },
        },
      ],
    });

    const error = await provisionDriverAccount({
      email: "a@b.com",
      password: "password",
      name: "Alex Morgan",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as { fieldErrors?: Record<string, string> }).fieldErrors).toEqual({
      temporaryPassword: expect.stringMatching(/data breach/i),
    });
  });

  it("keeps the two rejection kinds distinct from each other", async () => {
    createUser.mockRejectedValueOnce({
      errors: [{ code: "form_identifier_exists", message: "already exists" }],
    });
    const emailError = (await provisionDriverAccount({
      email: "taken@b.com",
      password: "correct-horse",
      name: "Alex Morgan",
    }).catch((caught: unknown) => caught)) as { fieldErrors?: Record<string, string> };

    createUser.mockRejectedValueOnce({
      errors: [
        { code: "form_password_pwned", message: "weak", meta: { paramName: "password" } },
      ],
    });
    const passwordError = (await provisionDriverAccount({
      email: "a@b.com",
      password: "password",
      name: "Alex Morgan",
    }).catch((caught: unknown) => caught)) as { fieldErrors?: Record<string, string> };

    expect(Object.keys(emailError.fieldErrors ?? {})).toEqual(["email"]);
    expect(Object.keys(passwordError.fieldErrors ?? {})).toEqual(["temporaryPassword"]);
  });
});
