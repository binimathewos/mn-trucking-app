import { getGreeting } from "@/features/dashboard/lib/greeting";

interface DashboardHeaderProps {
  firstName: string;
}

export function DashboardHeader({ firstName }: DashboardHeaderProps) {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {formattedDate}
      </p>
      <h2 className="mt-1 text-3xl font-semibold text-foreground">
        {getGreeting(firstName, now)}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Here&apos;s what&apos;s happening across your operation today.
      </p>
    </div>
  );
}
