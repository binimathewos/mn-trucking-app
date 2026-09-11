import { Activity, Banknote, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeAverageDailyHours } from "@/features/timesheets/lib/calculations";
import type { DriverSubmissionRow } from "@/features/timesheets/types";

interface MyTimesheetSummaryProps {
  row: DriverSubmissionRow;
}

const hoursFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function MyTimesheetSummary({ row }: MyTimesheetSummaryProps) {
  const cards = [
    {
      label: "Hours this week",
      value: hoursFormatter.format(row.hoursLogged),
      icon: Clock,
      iconClassName: "bg-orange-100 text-orange-600",
    },
    {
      label: "Calculated pay",
      value: `$${row.totalCalculatedPay}`,
      icon: Banknote,
      iconClassName: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Avg. daily hours",
      value: hoursFormatter.format(computeAverageDailyHours(row.dailyEntries)),
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
              className={`flex size-9 items-center justify-center rounded-lg ${card.iconClassName}`}
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
