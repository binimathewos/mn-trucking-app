import { describe, expect, it, vi, beforeEach } from "vitest";

const getSessionAccess = vi.fn();
const isRouteAssignedToDriver = vi.fn();
const upsertDailyEntry = vi.fn();
const upsertNonDrivingDay = vi.fn();
const deleteNonDrivingDay = vi.fn();

vi.mock("@/lib/auth/get-session-access", () => ({ getSessionAccess }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    route: { update: vi.fn() },
    driverPaySettings: { upsert: vi.fn() },
  },
}));

vi.mock("@/features/routes/data/route-repository", () => ({ isRouteAssignedToDriver }));

vi.mock("@/features/timesheets/data/timesheet-repository", () => ({
  upsertDailyEntry,
  deleteDailyEntry: vi.fn(),
  deleteTimesheet: vi.fn(),
  upsertNonDrivingDay,
  deleteNonDrivingDay,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveDailyEntryAction, saveNonDrivingDayAction, deleteNonDrivingDayAction } = await import(
  "@/features/timesheets/actions/timesheet-actions"
);
const { prisma } = await import("@/lib/db/prisma");

const VALID_INPUT = {
  driverId: "user_1",
  weekStart: "2026-08-31",
  date: "2026-09-02",
  startTime: "07:00",
  endTime: "15:30",
  routeId: "route_1",
};

function userWithDriver(userId: string, driverProfileId: string) {
  return { id: userId, driver: { id: driverProfileId } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveDailyEntryAction authorization", () => {
  it("allows a driver saving their own entry against their own assigned route", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "driver",
      user: { id: "clerk_1" },
    });
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(userWithDriver("user_1", "driverprofile_1") as never)
      .mockResolvedValueOnce(userWithDriver("user_1", "driverprofile_1") as never);
    isRouteAssignedToDriver.mockResolvedValueOnce(true);

    await saveDailyEntryAction(VALID_INPUT);

    expect(isRouteAssignedToDriver).toHaveBeenCalledWith("route_1", "driverprofile_1");
    expect(upsertDailyEntry).toHaveBeenCalledWith(expect.objectContaining({ driverId: "user_1", routeId: "route_1" }));
  });

  it("rejects a driver saving against a route assigned to a different driver (FR-004)", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "driver",
      user: { id: "clerk_1" },
    });
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(userWithDriver("user_1", "driverprofile_1") as never)
      .mockResolvedValueOnce(userWithDriver("user_1", "driverprofile_1") as never);
    isRouteAssignedToDriver.mockResolvedValueOnce(false);

    await expect(saveDailyEntryAction(VALID_INPUT)).rejects.toThrow(/route isn't assigned/i);
    expect(upsertDailyEntry).not.toHaveBeenCalled();
  });

  it("rejects an administrator saving on behalf of a driver against a route not assigned to that driver (FR-019)", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "administrator",
      user: { id: "clerk_admin" },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      userWithDriver("user_2", "driverprofile_2") as never,
    );
    isRouteAssignedToDriver.mockResolvedValueOnce(false);

    await expect(
      saveDailyEntryAction({ ...VALID_INPUT, driverId: "user_2" }),
    ).rejects.toThrow(/route isn't assigned/i);
    expect(upsertDailyEntry).not.toHaveBeenCalled();
  });

  it("rejects a driver attempting to submit for a different driverId than their own session", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "driver",
      user: { id: "clerk_1" },
    });
    // Session resolves to the caller's own user/driver (user_1/driverprofile_1),
    // regardless of the driverId ("user_2") submitted in the payload.
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(userWithDriver("user_1", "driverprofile_1") as never)
      .mockResolvedValueOnce(userWithDriver("user_1", "driverprofile_1") as never);
    // The submitted route belongs to a different driver, so it's not assigned to the caller's own profile.
    isRouteAssignedToDriver.mockResolvedValueOnce(false);

    await expect(
      saveDailyEntryAction({ ...VALID_INPUT, driverId: "user_2", routeId: "route_for_driver_2" }),
    ).rejects.toThrow();

    // The forced driverId (the caller's own) is what gets looked up and written — never the submitted one.
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { id: "user_1" } }));
    expect(upsertDailyEntry).not.toHaveBeenCalled();
  });

  it("has no effect on any Route/DriverPaySettings row when the payload carries an extraneous rate field (FR-022)", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "driver",
      user: { id: "clerk_1" },
    });
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(userWithDriver("user_1", "driverprofile_1") as never)
      .mockResolvedValueOnce(userWithDriver("user_1", "driverprofile_1") as never);
    isRouteAssignedToDriver.mockResolvedValueOnce(true);

    await saveDailyEntryAction({ ...VALID_INPUT, hourlyRate: "999.00" });

    expect(upsertDailyEntry).toHaveBeenCalledWith(
      expect.not.objectContaining({ hourlyRate: expect.anything() }),
    );
    expect(prisma.route.update).not.toHaveBeenCalled();
    expect(prisma.driverPaySettings.upsert).not.toHaveBeenCalled();
  });
});

const VALID_NON_DRIVING_INPUT = {
  driverId: "user_1",
  weekStart: "2026-08-31",
  date: "2026-09-02",
  reason: "DAY_OFF",
};

describe("saveNonDrivingDayAction authorization", () => {
  it("allows a driver marking their own day as Not Driving", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "driver",
      user: { id: "clerk_1" },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      userWithDriver("user_1", "driverprofile_1") as never,
    );

    await saveNonDrivingDayAction(VALID_NON_DRIVING_INPUT);

    expect(upsertNonDrivingDay).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: "user_1", reason: "DAY_OFF" }),
    );
  });

  it("allows an administrator marking Not Driving on behalf of any driver", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "administrator",
      user: { id: "clerk_admin" },
    });

    await saveNonDrivingDayAction({ ...VALID_NON_DRIVING_INPUT, driverId: "user_2" });

    expect(upsertNonDrivingDay).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: "user_2" }),
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("forces a driver's own id regardless of the submitted driverId", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "driver",
      user: { id: "clerk_1" },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      userWithDriver("user_1", "driverprofile_1") as never,
    );

    await saveNonDrivingDayAction({ ...VALID_NON_DRIVING_INPUT, driverId: "user_2" });

    expect(upsertNonDrivingDay).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: "user_1" }),
    );
  });

  it("rejects an unsigned-in caller", async () => {
    getSessionAccess.mockResolvedValue({ isSignedIn: false, role: undefined, user: null });

    await expect(saveNonDrivingDayAction(VALID_NON_DRIVING_INPUT)).rejects.toThrow(/not authorized/i);
    expect(upsertNonDrivingDay).not.toHaveBeenCalled();
  });
});

describe("deleteNonDrivingDayAction authorization", () => {
  it("allows a driver undoing their own Not Driving day", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "driver",
      user: { id: "clerk_1" },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      userWithDriver("user_1", "driverprofile_1") as never,
    );

    await deleteNonDrivingDayAction({ driverId: "user_1", weekStart: "2026-08-31", date: "2026-09-02" });

    expect(deleteNonDrivingDay).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: "user_1" }),
    );
  });

  it("allows an administrator undoing any driver's Not Driving day", async () => {
    getSessionAccess.mockResolvedValue({
      isSignedIn: true,
      role: "administrator",
      user: { id: "clerk_admin" },
    });

    await deleteNonDrivingDayAction({ driverId: "user_2", weekStart: "2026-08-31", date: "2026-09-02" });

    expect(deleteNonDrivingDay).toHaveBeenCalledWith(
      expect.objectContaining({ driverId: "user_2" }),
    );
  });
});
