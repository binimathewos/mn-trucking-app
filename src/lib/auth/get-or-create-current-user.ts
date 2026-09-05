import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSessionAccess } from "@/lib/auth/get-session-access";

function toUserRole(role: "administrator" | "driver" | undefined): UserRole {
  return role === "administrator" ? UserRole.ADMINISTRATOR : UserRole.DRIVER;
}

export async function getOrCreateCurrentUser() {
  const { isSignedIn, user, role } = await getSessionAccess();

  if (!isSignedIn || !user) {
    throw new Error("getOrCreateCurrentUser called without a signed-in session");
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown";
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const prismaRole = toUserRole(role);

  return prisma.user.upsert({
    where: { clerkUserId: user.id },
    update: { name, email, role: prismaRole },
    create: { clerkUserId: user.id, name, email, role: prismaRole },
  });
}
