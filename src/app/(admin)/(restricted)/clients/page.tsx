import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { ClientsHeader } from "@/features/clients/components/clients-header";
import { ClientsSearchBar } from "@/features/clients/components/clients-search-bar";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { getClientDirectory } from "@/features/clients/data/client-repository";

interface ClientsPageProps {
  searchParams: Promise<{ search?: string | string[] }>;
}

const clientsSearchParamsSchema = z.object({
  search: z.string().min(1).optional(),
});

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const rawParams = await searchParams;
  const parsedParams = clientsSearchParamsSchema.safeParse({ search: firstValue(rawParams.search) });
  const { search } = parsedParams.success ? parsedParams.data : {};

  const [clients, allClients] = await Promise.all([
    getClientDirectory({ search }),
    getClientDirectory(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <ClientsHeader />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Client directory</h2>
              <p className="text-sm text-muted-foreground">All clients used by route forms</p>
            </div>
            <ClientsSearchBar currentSearch={search} />
          </div>
          <ClientsTable rows={clients} hasAnyClients={allClients.length > 0} />
        </CardContent>
      </Card>
    </div>
  );
}
