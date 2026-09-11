import { describe, expect, it } from "vitest";
import {
  computeCalculatedPay,
  computeTotalCalculatedPay,
} from "@/features/timesheets/lib/calculations";

describe("computeCalculatedPay", () => {
  it("multiplies hours by the route's hourly rate", () => {
    expect(computeCalculatedPay(8, "22.00")).toBe("176.00");
  });

  it("returns null when there is no route/rate", () => {
    expect(computeCalculatedPay(8, null)).toBeNull();
  });

  it("returns '0.00' for a zero rate", () => {
    expect(computeCalculatedPay(8, "0.00")).toBe("0.00");
  });

  it("handles fractional hours", () => {
    expect(computeCalculatedPay(7.5, "20.00")).toBe("150.00");
  });
});

describe("computeTotalCalculatedPay", () => {
  it("sums non-null calculatedPay values", () => {
    expect(
      computeTotalCalculatedPay([
        { calculatedPay: "100.00" },
        { calculatedPay: "50.50" },
        { calculatedPay: null },
      ]),
    ).toBe("150.50");
  });

  it("is '0.00' for no entries", () => {
    expect(computeTotalCalculatedPay([])).toBe("0.00");
  });

  it("is '0.00' when every entry has no route", () => {
    expect(computeTotalCalculatedPay([{ calculatedPay: null }, { calculatedPay: null }])).toBe("0.00");
  });
});
