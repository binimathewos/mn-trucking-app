import { ArrowDown, ArrowUp, Clock, Minus, Package, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OperationalSummary, TrendDirection } from "@/features/dashboard/types";

interface SummaryCardsProps {
  summary: OperationalSummary;
}

const numberFormatter = new Intl.NumberFormat("en-US");

function TrendIndicator({
  trendPercent,
  trendDirection,
}: {
  trendPercent: number;
  trendDirection: TrendDirection;
}) {
  const Icon =
    trendDirection === "up" ? ArrowUp : trendDirection === "down" ? ArrowDown : Minus;

  return (
    <p
      className={cn(
        "mt-3 flex items-center gap-1 text-xs font-medium",
        trendDirection === "up" && "text-emerald-600",
        trendDirection === "down" && "text-red-600",
        trendDirection === "flat" && "text-muted-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span>{Math.abs(trendPercent)}%</span>
      <span className="font-normal text-muted-foreground">vs last month</span>
    </p>
  );
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: "Active drivers",
      value: numberFormatter.format(summary.activeDrivers.value),
      trendPercent: summary.activeDrivers.trendPercent,
      trendDirection: summary.activeDrivers.trendDirection,
      icon: Users,
      iconClassName: "bg-blue-100 text-blue-600",
    },
    {
      label: "Hours this week",
      value: numberFormatter.format(summary.hoursThisWeek.value),
      trendPercent: summary.hoursThisWeek.trendPercent,
      trendDirection: summary.hoursThisWeek.trendDirection,
      icon: Clock,
      iconClassName: "bg-orange-100 text-orange-600",
    },
    {
      label: "In inventory",
      value: numberFormatter.format(summary.inInventory.value),
      trendPercent: summary.inInventory.trendPercent,
      trendDirection: summary.inInventory.trendDirection,
      icon: Package,
      iconClassName: "bg-emerald-100 text-emerald-600",
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
            <TrendIndicator
              trendPercent={card.trendPercent}
              trendDirection={card.trendDirection}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
