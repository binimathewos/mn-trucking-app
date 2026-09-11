import { describe, expect, it } from "vitest";
import { autoStatusForDriverPresence, isFinalStatus } from "@/features/routes/lib/route-status";

describe("isFinalStatus", () => {
  it("is true only for COMPLETED and CANCELLED", () => {
    expect(isFinalStatus("COMPLETED")).toBe(true);
    expect(isFinalStatus("CANCELLED")).toBe(true);
    expect(isFinalStatus("SCHEDULED")).toBe(false);
    expect(isFinalStatus("ASSIGNED")).toBe(false);
    expect(isFinalStatus("IN_PROGRESS")).toBe(false);
  });
});

describe("autoStatusForDriverPresence", () => {
  it("returns ASSIGNED when a driver is present", () => {
    expect(autoStatusForDriverPresence(true)).toBe("ASSIGNED");
  });

  it("returns SCHEDULED when no driver is present", () => {
    expect(autoStatusForDriverPresence(false)).toBe("SCHEDULED");
  });
});
