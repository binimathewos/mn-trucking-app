import { describe, expect, it } from "vitest";
import { getStorageDurationDays } from "@/features/dashboard/lib/storage-duration";

describe("getStorageDurationDays", () => {
  it("measures through today when there is no checked-out date", () => {
    const today = new Date("2026-09-10T15:00:00Z");
    expect(getStorageDurationDays("2026-09-04", null, today)).toBe(6);
  });

  it("measures through the checked-out date when present", () => {
    const today = new Date("2026-09-20T00:00:00Z");
    expect(getStorageDurationDays("2026-09-04", "2026-09-09", today)).toBe(5);
  });
});
