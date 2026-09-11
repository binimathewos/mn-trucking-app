export type TimesheetStatus = "not_submitted" | "draft" | "submitted";

export type NonDrivingReason = "NO_JOB" | "DAY_OFF" | "OTHER";

export interface Driver {
  id: string;
  name: string;
  roleType: string;
  truckNumber: string | null;
  /** The underlying `Driver.id` (not `User.id`) when this user is a driver, else `null`. */
  driverProfileId: string | null;
}

export interface DailyEntry {
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  savedAt: string;
  routeId: string | null;
  routeLabel: string | null;
  hourlyRate: string | null;
  calculatedPay: string | null;
}

export interface NonDrivingDayInfo {
  date: string;
  reason: NonDrivingReason;
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
  nonDrivingDays: NonDrivingDayInfo[];
  totalCalculatedPay: string;
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
