import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { DriverDirectoryTable } from "@/features/drivers/components/driver-directory-table";
import { DriverFiltersBar } from "@/features/drivers/components/driver-filters-bar";
import { DriversHeader } from "@/features/drivers/components/drivers-header";
import { SummaryCards } from "@/features/drivers/components/summary-cards";
import { getDriverDirectory } from "@/features/drivers/data/driver-repository";

interface DriversPageProps {
  searchParams: Promise<{ status?: string | string[]; search?: string | string[] }>;
}

const driversSearchParamsSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
  search: z.string().min(1).optional(),
});

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function DriversPage({ searchParams }: DriversPageProps) {
  const rawParams = await searchParams;
  const parsedParams = driversSearchParamsSchema.safeParse({
    status: firstValue(rawParams.status),
    search: firstValue(rawParams.search),
  });
  const { status, search } = parsedParams.success ? parsedParams.data : {};

  const { stats, drivers } = await getDriverDirectory({ status, search });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <DriversHeader />
      <SummaryCards stats={stats} />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Driver directory</h2>
              <p className="text-sm text-muted-foreground">
                All drivers and team members in your workspace
              </p>
            </div>
            <DriverFiltersBar currentStatus={status} currentSearch={search} />
          </div>
          <DriverDirectoryTable rows={drivers} hasActiveFilters={Boolean(status || search)} />
        </CardContent>
      </Card>
    </div>
  );
}
