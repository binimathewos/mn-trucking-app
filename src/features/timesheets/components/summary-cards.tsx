import { Activity, CheckCircle2, Clock, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TimesheetSummary } from "@/features/timesheets/types";

interface SummaryCardsProps {
  summary: TimesheetSummary;
}

const hoursFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: "Team hours",
      value: hoursFormatter.format(summary.totalTeamHours),
      icon: Clock,
      iconClassName: "bg-orange-100 text-orange-600",
    },
    {
      label: "Submitted",
      value: `${summary.submittedCount} / ${summary.totalDriverCount}`,
      icon: CheckCircle2,
      iconClassName: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Avg. daily hours",
      value: hoursFormatter.format(summary.averageDailyHours),
      icon: Activity,
      iconClassName: "bg-blue-100 text-blue-600",
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
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Minus className="size-3" aria-hidden="true" />
              <span>Reflects current filters</span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
