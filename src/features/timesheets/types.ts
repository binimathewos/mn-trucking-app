export type TimesheetStatus = "not_submitted" | "draft" | "submitted";

export interface Driver {
  id: string;
  name: string;
  roleType: string;
  truckNumber: string | null;
}

export interface DailyEntry {
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  savedAt: string;
}

export interface DriverSubmissionRow {
  driverId: string;
  driverName: string;
  roleType: string;
  truckNumber: string | null;
  hoursLogged: number;
  lastSubmittedAt: string | null;
  status: TimesheetStatus;
  dailyEntries: DailyEntry[];
}

export interface TimesheetSummary {
  totalTeamHours: number;
  submittedCount: number;
  totalDriverCount: number;
  averageDailyHours: number;
}

export interface WeekOption {
  value: string;
  label: string;
}
