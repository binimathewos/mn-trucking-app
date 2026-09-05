import { describe, expect, it } from "vitest";
import { getGreeting, getTimeOfDay } from "@/features/dashboard/lib/greeting";

describe("getTimeOfDay", () => {
  it("is morning before noon", () => {
    expect(getTimeOfDay(new Date("2026-09-04T11:59:00"))).toBe("morning");
  });

  it("is afternoon from noon up to 6pm", () => {
    expect(getTimeOfDay(new Date("2026-09-04T12:00:00"))).toBe("afternoon");
    expect(getTimeOfDay(new Date("2026-09-04T17:59:00"))).toBe("afternoon");
  });

  it("is evening from 6pm onward", () => {
    expect(getTimeOfDay(new Date("2026-09-04T18:00:00"))).toBe("evening");
  });
});

describe("getGreeting", () => {
  it("includes the first name and the correct time-of-day label", () => {
    expect(getGreeting("Jordan", new Date("2026-09-04T09:00:00"))).toBe(
      "Good morning, Jordan",
    );
    expect(getGreeting("Jordan", new Date("2026-09-04T14:00:00"))).toBe(
      "Good afternoon, Jordan",
    );
    expect(getGreeting("Jordan", new Date("2026-09-04T20:00:00"))).toBe(
      "Good evening, Jordan",
    );
  });
});
