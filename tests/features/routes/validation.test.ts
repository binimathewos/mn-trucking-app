import { describe, expect, it } from "vitest";
import { createRouteInputSchema, updateRouteInputSchema } from "@/features/routes/lib/validation";

const VALID_CREATE_INPUT = {
  clientId: "client_1",
  pickupAddress: "123 A St",
  deliveryAddress: "456 B St",
  pickupAt: "2026-01-01",
};

describe("createRouteInputSchema", () => {
  it("accepts a date-only pickupAt", () => {
    expect(createRouteInputSchema.safeParse(VALID_CREATE_INPUT).success).toBe(true);
  });

  it("accepts an optional date-only deliveryAt", () => {
    const result = createRouteInputSchema.safeParse({ ...VALID_CREATE_INPUT, deliveryAt: "2026-01-02" });
    expect(result.success).toBe(true);
  });

  it("treats an empty deliveryAt as omitted", () => {
    const result = createRouteInputSchema.safeParse({ ...VALID_CREATE_INPUT, deliveryAt: "" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.deliveryAt).toBeUndefined();
  });

  it("rejects a datetime string with a time component", () => {
    const result = createRouteInputSchema.safeParse({ ...VALID_CREATE_INPUT, pickupAt: "2026-01-01T08:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = createRouteInputSchema.safeParse({ ...VALID_CREATE_INPUT, pickupAt: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing pickupAt", () => {
    const input: Partial<typeof VALID_CREATE_INPUT> = { ...VALID_CREATE_INPUT };
    delete input.pickupAt;
    expect(createRouteInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("updateRouteInputSchema", () => {
  it("accepts a date-only pickupAt alongside routeId", () => {
    const result = updateRouteInputSchema.safeParse({ ...VALID_CREATE_INPUT, routeId: "route_1" });
    expect(result.success).toBe(true);
  });

  it("rejects a datetime string with a time component", () => {
    const result = updateRouteInputSchema.safeParse({
      ...VALID_CREATE_INPUT,
      routeId: "route_1",
      pickupAt: "2026-01-01T08:00",
    });
    expect(result.success).toBe(false);
  });
});
