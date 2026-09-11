"use server";

import { revalidatePath } from "next/cache";
import { getSessionAccess } from "@/lib/auth/get-session-access";
import { resolveAdminOnlyAccess } from "@/lib/auth/route-access";
import { prisma } from "@/lib/db/prisma";
import {
  addClientInputSchema,
  setClientStatusInputSchema,
  updateClientInputSchema,
} from "@/features/clients/lib/validation";
import { ClientActionError } from "@/features/clients/types";

/** Re-checks authorization independently of the UI (defense in depth). */
export async function assertAdminAccess(): Promise<void> {
  const { isSignedIn, role } = await getSessionAccess();
  const access = resolveAdminOnlyAccess({ isSignedIn, role });

  if (access.outcome !== "render") {
    throw new Error("Not authorized to manage clients.");
  }
}

function fieldErrorsFromZod(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function addClientAction(
  input: unknown,
): Promise<{ clientId: string; client: { id: string; companyName: string } }> {
  await assertAdminAccess();

  const parsed = addClientInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ClientActionError("Check the form for errors.", fieldErrorsFromZod(parsed.error));
  }

  const client = await prisma.client.create({
    data: { ...parsed.data, status: "ACTIVE" },
  });

  revalidatePath("/clients");
  revalidatePath("/routes");
  return { clientId: client.id, client: { id: client.id, companyName: client.companyName } };
}

export async function updateClientAction(input: unknown): Promise<void> {
  await assertAdminAccess();

  const parsed = updateClientInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ClientActionError("Check the form for errors.", fieldErrorsFromZod(parsed.error));
  }
  const { clientId, ...data } = parsed.data;

  const existing = await prisma.client.findUnique({ where: { id: clientId } });
  if (!existing) {
    throw new ClientActionError("This client no longer exists.");
  }

  await prisma.client.update({ where: { id: clientId }, data });

  revalidatePath("/clients");
}

export async function setClientStatusAction(input: unknown): Promise<void> {
  await assertAdminAccess();

  const parsed = setClientStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ClientActionError("Invalid status change request.");
  }
  const { clientId, status } = parsed.data;

  const existing = await prisma.client.findUnique({ where: { id: clientId } });
  if (!existing) {
    throw new ClientActionError("This client no longer exists.");
  }

  await prisma.client.update({ where: { id: clientId }, data: { status } });

  revalidatePath("/clients");
  revalidatePath("/routes");
}
