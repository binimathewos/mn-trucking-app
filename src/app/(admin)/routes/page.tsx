import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { prisma } from "@/lib/db/prisma";
import { getActiveClients } from "@/features/clients/data/client-repository";
import { getActiveDriversForSelect } from "@/features/drivers/data/driver-repository";
import { MyRoutesTable } from "@/features/routes/components/my-routes-table";
import { RouteFiltersBar } from "@/features/routes/components/route-filters-bar";
import { RoutesHeader } from "@/features/routes/components/routes-header";
import { RoutesTable } from "@/features/routes/components/routes-table";
import { getMyRoutes, getRouteDirectory } from "@/features/routes/data/route-repository";

interface RoutesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const routesSearchParamsSchema = z.object({
  status: z.enum(["SCHEDULED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  driverId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  pickupDateFrom: z.string().min(1).optional(),
  pickupDateTo: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
});

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function RoutesPage({ searchParams }: RoutesPageProps) {
  const { role, user } = await getSessionAccess();

  if (role !== "administrator") {
    const sessionUser = user
      ? await prisma.user.findUnique({ where: { clerkUserId: user.id }, include: { driver: true } })
      : null;
    const driverId = sessionUser?.driver?.id;
    const routes = driverId ? await getMyRoutes(driverId) : [];

    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Operations / Routes
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">My routes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Routes assigned to you.</p>
        </div>

        <Card>
          <CardContent>
            <MyRoutesTable rows={routes} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const rawParams = await searchParams;
  const parsedParams = routesSearchParamsSchema.safeParse({
    status: firstValue(rawParams.status),
    driverId: firstValue(rawParams.driverId),
    clientId: firstValue(rawParams.clientId),
    pickupDateFrom: firstValue(rawParams.pickupDateFrom),
    pickupDateTo: firstValue(rawParams.pickupDateTo),
    search: firstValue(rawParams.search),
  });
  const filters = parsedParams.success ? parsedParams.data : {};

  const [routes, allRoutes, activeClients, activeDrivers] = await Promise.all([
    getRouteDirectory(filters),
    getRouteDirectory(),
    getActiveClients(),
    getActiveDriversForSelect(),
  ]);

  const hasActiveFilters = Boolean(
    filters.status || filters.driverId || filters.clientId || filters.pickupDateFrom || filters.pickupDateTo || filters.search,
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <RoutesHeader activeClients={activeClients} activeDrivers={activeDrivers} />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Route directory</h2>
              <p className="text-sm text-muted-foreground">All delivery and transport jobs</p>
            </div>
            <RouteFiltersBar
              activeDrivers={activeDrivers}
              activeClients={activeClients}
              currentStatus={filters.status}
              currentDriverId={filters.driverId}
              currentClientId={filters.clientId}
              currentPickupDateFrom={filters.pickupDateFrom}
              currentPickupDateTo={filters.pickupDateTo}
              currentSearch={filters.search}
            />
          </div>
          <RoutesTable
            rows={routes}
            hasAnyRoutes={allRoutes.length > 0}
            hasActiveFilters={hasActiveFilters}
            activeClients={activeClients}
            activeDrivers={activeDrivers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
