import { CalendarClock, CheckCircle2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DriverDirectoryStats } from "@/features/drivers/types";

interface SummaryCardsProps {
  stats: DriverDirectoryStats;
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total drivers",
      value: stats.totalDrivers,
      icon: Users,
      iconClassName: "bg-blue-100 text-blue-600",
    },
    {
      label: "Active today",
      value: stats.activeToday,
      icon: CheckCircle2,
      iconClassName: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "On leave",
      value: stats.onLeave,
      icon: CalendarClock,
      iconClassName: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                card.iconClassName,
              )}
              aria-hidden="true"
            >
              <card.icon className="size-4.5" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
