import { describe, expect, it } from "vitest";
import {
  addDriverInputSchema,
  updateDriverInputSchema,
} from "@/features/drivers/lib/validation";

const VALID_ADD_INPUT = {
  fullName: "Alex Morgan",
  email: "alex@mntrucking.com",
  temporaryPassword: "correct-horse-battery-staple",
};

const VALID_UPDATE_INPUT = {
  driverId: "driver_1",
  fullName: "Alex Morgan",
  status: "ACTIVE" as const,
};

describe("addDriverInputSchema", () => {
  it("accepts a valid minimal payload", () => {
    expect(addDriverInputSchema.safeParse(VALID_ADD_INPUT).success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const withoutFullName: Partial<typeof VALID_ADD_INPUT> = { ...VALID_ADD_INPUT };
    delete withoutFullName.fullName;
    expect(addDriverInputSchema.safeParse(withoutFullName).success).toBe(false);
  });

  it("never accepts a role/administrator-elevation field of any kind", () => {
    const result = addDriverInputSchema.safeParse({
      ...VALID_ADD_INPUT,
      role: "administrator",
      isAdmin: true,
    });
    expect(result.success).toBe(true);
    expect(result.success && "role" in result.data).toBe(false);
    expect(result.success && "isAdmin" in result.data).toBe(false);
  });
});

describe("updateDriverInputSchema", () => {
  it("accepts a valid minimal payload", () => {
    expect(updateDriverInputSchema.safeParse(VALID_UPDATE_INPUT).success).toBe(true);
  });

  it("does not accept an email field (read-only, FR-019/FR-020)", () => {
    const result = updateDriverInputSchema.safeParse({
      ...VALID_UPDATE_INPUT,
      email: "new@mntrucking.com",
    });
    expect(result.success).toBe(true);
    expect(result.success && "email" in result.data).toBe(false);
  });

  it("never accepts a role/administrator-elevation field of any kind", () => {
    const result = updateDriverInputSchema.safeParse({
      ...VALID_UPDATE_INPUT,
      role: "administrator",
    });
    expect(result.success).toBe(true);
    expect(result.success && "role" in result.data).toBe(false);
  });
});
