import { describe, expect, it } from "vitest";
import { formatRouteNumber } from "@/features/routes/lib/route-number";

describe("formatRouteNumber", () => {
  it("zero-pads to 6 digits with an RT- prefix", () => {
    expect(formatRouteNumber(1)).toBe("RT-000001");
    expect(formatRouteNumber(42)).toBe("RT-000042");
  });

  it("does not truncate a sequence number wider than 6 digits", () => {
    expect(formatRouteNumber(1234567)).toBe("RT-1234567");
  });
});
