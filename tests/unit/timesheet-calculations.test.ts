import { describe, expect, it } from "vitest";
import {
  computeAverageDailyHours,
  computeHoursFromTimeRange,
  dailyEntryInputSchema,
  deriveLastSubmittedAt,
  deriveStatus,
  deriveTotalHours,
  getTimesheetSummary,
  getWeekDates,
  getWeekStart,
  nonDrivingDayInputSchema,
} from "@/features/timesheets/lib/calculations";
import type { DriverSubmissionRow } from "@/features/timesheets/types";

describe("getWeekDates", () => {
  it("returns the 7 Monday-to-Sunday dates for a week", () => {
    expect(getWeekDates("2026-08-31")).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });
});

describe("getWeekStart", () => {
  it("returns the same Monday for every day of that week", () => {
    expect(getWeekStart("2026-08-31")).toBe("2026-08-31");
    expect(getWeekStart("2026-09-02")).toBe("2026-08-31");
    expect(getWeekStart("2026-09-06")).toBe("2026-08-31");
  });
});

describe("computeHoursFromTimeRange", () => {
  it("computes whole-hour ranges", () => {
    expect(computeHoursFromTimeRange("07:00", "16:00")).toBe(9);
  });

  it("computes fractional-hour ranges", () => {
    expect(computeHoursFromTimeRange("08:00", "08:30")).toBe(0.5);
    expect(computeHoursFromTimeRange("07:00", "12:00")).toBe(5);
  });

  it("returns a negative number when endTime is before startTime", () => {
    expect(computeHoursFromTimeRange("16:00", "07:00")).toBeLessThan(0);
  });
});

describe("deriveStatus", () => {
  const weekStart = "2026-08-31";

  it("is not_submitted with zero entries", () => {
    expect(deriveStatus(weekStart, [])).toBe("not_submitted");
  });

  it("is draft with 1 to 6 of the week's dates covered", () => {
    expect(
      deriveStatus(weekStart, [
        { date: "2026-08-31" },
        { date: "2026-09-01" },
        { date: "2026-09-02" },
      ]),
    ).toBe("draft");
  });

  it("is submitted when all 7 of the week's dates are covered", () => {
    expect(
      deriveStatus(
        weekStart,
        getWeekDates(weekStart).map((date) => ({ date })),
      ),
    ).toBe("submitted");
  });

  it("counts a Not Driving day as covered, not missing", () => {
    expect(deriveStatus(weekStart, [], [{ date: "2026-08-31" }])).toBe("draft");
  });

  it("is submitted when entries and Not Driving days together cover all 7 dates", () => {
    const weekDates = getWeekDates(weekStart);
    expect(
      deriveStatus(
        weekStart,
        weekDates.slice(0, 5).map((date) => ({ date })),
        weekDates.slice(5).map((date) => ({ date })),
      ),
    ).toBe("submitted");
  });

  it("does not double-count a date present in both entries and Not Driving days", () => {
    expect(
      deriveStatus(weekStart, [{ date: "2026-08-31" }], [{ date: "2026-08-31" }]),
    ).toBe("draft");
  });
});

describe("deriveTotalHours", () => {
  it("sums entry hours", () => {
    expect(deriveTotalHours([{ hours: 8 }, { hours: 9.5 }])).toBe(17.5);
  });

  it("is 0 for no entries", () => {
    expect(deriveTotalHours([])).toBe(0);
  });
});

describe("deriveLastSubmittedAt", () => {
  it("is null for no entries", () => {
    expect(deriveLastSubmittedAt([])).toBeNull();
  });

  it("is the max savedAt across entries", () => {
    expect(
      deriveLastSubmittedAt([
        { savedAt: "2026-09-01T10:00:00.000Z" },
        { savedAt: "2026-09-02T08:00:00.000Z" },
        { savedAt: "2026-08-30T23:00:00.000Z" },
      ]),
    ).toBe("2026-09-02T08:00:00.000Z");
  });
});

describe("computeAverageDailyHours", () => {
  it("is 0 for no entries (avoids divide-by-zero)", () => {
    expect(computeAverageDailyHours([])).toBe(0);
  });

  it("divides total hours by the count of logged days, not driver/day count", () => {
    expect(computeAverageDailyHours([{ hours: 8 }, { hours: 10 }, { hours: 6 }])).toBe(8);
  });
});

describe("getTimesheetSummary", () => {
  it("aggregates totalTeamHours, submittedCount, totalDriverCount, averageDailyHours", () => {
    const rows: DriverSubmissionRow[] = [
      {
        driverId: "1",
        driverName: "Marcus Johnson",
        roleType: "Class A Driver",
        truckNumber: "Truck 12",
        hoursLogged: 16,
        lastSubmittedAt: "2026-09-01T10:00:00.000Z",
        status: "submitted",
        dailyEntries: [
          { date: "2026-08-31", startTime: "07:00", endTime: "15:00", hours: 8, savedAt: "2026-08-31T10:00:00.000Z", routeId: null, routeLabel: null, hourlyRate: null, calculatedPay: null },
          { date: "2026-09-01", startTime: "07:00", endTime: "15:00", hours: 8, savedAt: "2026-09-01T10:00:00.000Z", routeId: null, routeLabel: null, hourlyRate: null, calculatedPay: null },
        ],
        nonDrivingDays: [],
        totalCalculatedPay: "0.00",
      },
      {
        driverId: "2",
        driverName: "Sam Wilson",
        roleType: "Class A Driver",
        truckNumber: "Truck 07",
        hoursLogged: 4,
        lastSubmittedAt: "2026-08-31T09:00:00.000Z",
        status: "draft",
        dailyEntries: [
          { date: "2026-08-31", startTime: "07:00", endTime: "11:00", hours: 4, savedAt: "2026-08-31T09:00:00.000Z", routeId: null, routeLabel: null, hourlyRate: null, calculatedPay: null },
        ],
        nonDrivingDays: [],
        totalCalculatedPay: "0.00",
      },
      {
        driverId: "3",
        driverName: "Priya Nair",
        roleType: "Class B Driver",
        truckNumber: "Truck 15",
        hoursLogged: 0,
        lastSubmittedAt: null,
        status: "not_submitted",
        dailyEntries: [],
        nonDrivingDays: [],
        totalCalculatedPay: "0.00",
      },
    ];

    expect(getTimesheetSummary(rows)).toEqual({
      totalTeamHours: 20,
      submittedCount: 1,
      totalDriverCount: 3,
      averageDailyHours: 20 / 3,
    });
  });

  it("returns zeroed values for an empty scope", () => {
    expect(getTimesheetSummary([])).toEqual({
      totalTeamHours: 0,
      submittedCount: 0,
      totalDriverCount: 0,
      averageDailyHours: 0,
    });
  });
});

describe("dailyEntryInputSchema", () => {
  const valid = {
    driverId: "user_1",
    weekStart: "2026-08-31",
    date: "2026-09-02",
    startTime: "07:00",
    endTime: "15:30",
    routeId: "route_1",
  };

  it("accepts a valid entry", () => {
    expect(dailyEntryInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing routeId", () => {
    const withoutRoute: Partial<typeof valid> = { ...valid };
    delete withoutRoute.routeId;
    expect(dailyEntryInputSchema.safeParse(withoutRoute).success).toBe(false);
  });

  it("rejects a date outside the target week", () => {
    const result = dailyEntryInputSchema.safeParse({ ...valid, date: "2026-09-10" });
    expect(result.success).toBe(false);
  });

  it("rejects endTime not strictly after startTime", () => {
    expect(
      dailyEntryInputSchema.safeParse({ ...valid, startTime: "15:00", endTime: "15:00" })
        .success,
    ).toBe(false);
    expect(
      dailyEntryInputSchema.safeParse({ ...valid, startTime: "15:00", endTime: "07:00" })
        .success,
    ).toBe(false);
  });

  it("rejects malformed time strings", () => {
    expect(
      dailyEntryInputSchema.safeParse({ ...valid, startTime: "7am", endTime: "15:30" }).success,
    ).toBe(false);
  });
});

describe("nonDrivingDayInputSchema", () => {
  const valid = {
    driverId: "user_1",
    weekStart: "2026-08-31",
    date: "2026-09-02",
    reason: "DAY_OFF",
  };

  it("accepts a valid Not Driving day for each reason", () => {
    for (const reason of ["NO_JOB", "DAY_OFF", "OTHER"]) {
      expect(nonDrivingDayInputSchema.safeParse({ ...valid, reason }).success).toBe(true);
    }
  });

  it("rejects an unknown reason", () => {
    expect(nonDrivingDayInputSchema.safeParse({ ...valid, reason: "VACATION" }).success).toBe(false);
  });

  it("rejects a date outside the target week", () => {
    expect(nonDrivingDayInputSchema.safeParse({ ...valid, date: "2026-09-10" }).success).toBe(false);
  });
});
