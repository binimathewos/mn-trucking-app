export type TrendDirection = "up" | "down" | "flat";

interface SummaryMetric {
  value: number;
  trendPercent: number;
  trendDirection: TrendDirection;
}

export interface OperationalSummary {
  activeDrivers: SummaryMetric;
  hoursThisWeek: SummaryMetric;
  inInventory: SummaryMetric;
}

export type ContainerStatus = "in_warehouse" | "checked_out";

export interface ContainerInventoryRecord {
  id: string;
  containerNumber: string;
  customerName: string;
  location: string;
  receivedDate: string;
  checkedOutDate: string | null;
  status: ContainerStatus;
}

export interface DashboardInventoryPreview {
  records: ContainerInventoryRecord[];
  totalCount: number;
}
