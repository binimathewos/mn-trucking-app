import { ContainerInventoryCard } from "@/features/dashboard/components/container-inventory-card";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { SummaryCards } from "@/features/dashboard/components/summary-cards";
import { getOperationalSummary } from "@/features/dashboard/data/operational-summary";
import { getSessionAccess } from "@/lib/auth/get-session-access";

export default async function DashboardPage() {
  const { role, user } = await getSessionAccess();

  if (role !== "administrator") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Driver area</h1>
        <p className="text-sm text-muted-foreground">
          The driver experience is coming soon.
        </p>
      </div>
    );
  }

  const firstName = user?.firstName ?? "there";
  const summary = await getOperationalSummary();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <DashboardHeader firstName={firstName} />
      <SummaryCards summary={summary} />
      <ContainerInventoryCard />
    </div>
  );
}
