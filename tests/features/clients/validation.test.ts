import { describe, expect, it } from "vitest";
import { addClientInputSchema, updateClientInputSchema } from "@/features/clients/lib/validation";

const VALID_INPUT = {
  companyName: "Acme Logistics",
  contactName: "Jamie Lee",
  phone: "(612) 555-0100",
  email: "jamie@acme.com",
  address: "123 Main St, Minneapolis, MN",
};

describe("addClientInputSchema", () => {
  it("accepts a valid payload", () => {
    expect(addClientInputSchema.safeParse(VALID_INPUT).success).toBe(true);
  });

  it.each(["companyName", "contactName", "phone", "email", "address"])(
    "rejects a missing %s",
    (field) => {
      const input: Partial<typeof VALID_INPUT> = { ...VALID_INPUT };
      delete input[field as keyof typeof VALID_INPUT];
      expect(addClientInputSchema.safeParse(input).success).toBe(false);
    },
  );

  it("rejects an invalid phone format", () => {
    const result = addClientInputSchema.safeParse({ ...VALID_INPUT, phone: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email format", () => {
    const result = addClientInputSchema.safeParse({ ...VALID_INPUT, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("never accepts a status field", () => {
    const result = addClientInputSchema.safeParse({ ...VALID_INPUT, status: "INACTIVE" });
    expect(result.success).toBe(true);
    expect(result.success && "status" in result.data).toBe(false);
  });
});

describe("updateClientInputSchema", () => {
  it("accepts a valid payload with clientId", () => {
    expect(
      updateClientInputSchema.safeParse({ ...VALID_INPUT, clientId: "client_1" }).success,
    ).toBe(true);
  });

  it("requires clientId", () => {
    expect(updateClientInputSchema.safeParse(VALID_INPUT).success).toBe(false);
  });
});
