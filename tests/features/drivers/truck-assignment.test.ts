import { describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: { driver: { findFirst } },
}));

const { assertTruckAvailable } = await import("@/features/drivers/lib/truck-assignment");

describe("assertTruckAvailable", () => {
  it("rejects a truck already held by another non-INACTIVE driver (case-insensitive match)", async () => {
    findFirst.mockResolvedValueOnce({ id: "driver_other" });

    await expect(assertTruckAvailable("mn-104")).rejects.toThrow(/already assigned/i);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          truckNumber: { equals: "mn-104", mode: "insensitive" },
          status: { not: "INACTIVE" },
        }),
      }),
    );
  });

  it("allows it when excludeDriverId matches the current holder", async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(
      assertTruckAvailable("MN-104", "driver_self"),
    ).resolves.toBeUndefined();

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "driver_self" },
        }),
      }),
    );
  });

  it("allows reassignment of a truck freed by an INACTIVE driver", async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(assertTruckAvailable("MN-104")).resolves.toBeUndefined();

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: "INACTIVE" },
        }),
      }),
    );
  });
});
