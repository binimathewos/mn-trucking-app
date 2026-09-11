import { prisma } from "@/lib/db/prisma";
import type { ClientRow } from "@/features/clients/types";

export async function getClientDirectory(filters: { search?: string } = {}): Promise<ClientRow[]> {
  const searchTerm = filters.search?.trim();

  const clients = await prisma.client.findMany({
    where: searchTerm
      ? {
          OR: [
            { companyName: { contains: searchTerm, mode: "insensitive" } },
            { contactName: { contains: searchTerm, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { companyName: "asc" },
  });

  return clients.map((client) => ({
    id: client.id,
    companyName: client.companyName,
    contactName: client.contactName,
    phone: client.phone,
    email: client.email,
    address: client.address,
    status: client.status,
  }));
}

export async function getActiveClients(): Promise<{ id: string; companyName: string }[]> {
  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    orderBy: { companyName: "asc" },
    select: { id: true, companyName: true },
  });
  return clients;
}
