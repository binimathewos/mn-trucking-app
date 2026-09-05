import { z } from "zod";
import type { DriverSubmissionRow, TimesheetSummary, TimesheetStatus } from "@/features/timesheets/types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAYS_PER_WEEK = 7;

/** Returns the 7 ISO (`yyyy-mm-dd`) dates of the Monday-start week beginning at `weekStart`. */
export function getWeekDates(weekStart: string): string[] {
  const [year, month, day] = weekStart.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));

  return Array.from({ length: DAYS_PER_WEEK }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

/** The Monday (ISO `yyyy-mm-dd`) of the week containing `date`. */
export function getWeekStart(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  return utcDate.toISOString().slice(0, 10);
}

/** Decimal hours between two `HH:mm` times. Negative when `endTime` is not after `startTime`. */
export function computeHoursFromTimeRange(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return Math.round((minutes / 60) * 100) / 100;
}

/** Not Submitted (0 days) → Draft (1-6 days) → Submitted (all 7 days), per spec Clarifications. */
export function deriveStatus(
  weekStart: string,
  entries: { date: string }[],
): TimesheetStatus {
  const weekDates = new Set(getWeekDates(weekStart));
  const coveredCount = new Set(
    entries.map((entry) => entry.date).filter((date) => weekDates.has(date)),
  ).size;

  if (coveredCount === 0) {
    return "not_submitted";
  }

  if (coveredCount < DAYS_PER_WEEK) {
    return "draft";
  }

  return "submitted";
}

export function deriveTotalHours(entries: { hours: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.hours, 0);
}

export function deriveLastSubmittedAt(entries: { savedAt: string }[]): string | null {
  if (entries.length === 0) {
    return null;
  }

  return entries.reduce((latest, entry) => (entry.savedAt > latest ? entry.savedAt : latest), entries[0].savedAt);
}

/** Sum of hours ÷ count of logged days in scope — not divided by driver count or calendar days. */
export function computeAverageDailyHours(entries: { hours: number }[]): number {
  if (entries.length === 0) {
    return 0;
  }

  return deriveTotalHours(entries) / entries.length;
}

export function getTimesheetSummary(rows: DriverSubmissionRow[]): TimesheetSummary {
  const allEntries = rows.flatMap((row) => row.dailyEntries);

  return {
    totalTeamHours: rows.reduce((sum, row) => sum + row.hoursLogged, 0),
    submittedCount: rows.filter((row) => row.status === "submitted").length,
    totalDriverCount: rows.length,
    averageDailyHours: computeAverageDailyHours(allEntries),
  };
}

export const dailyEntryInputSchema = z
  .object({
    driverId: z.string().min(1),
    weekStart: z.string().regex(ISO_DATE_RE, "weekStart must be an ISO date (yyyy-mm-dd)"),
    date: z.string().regex(ISO_DATE_RE, "date must be an ISO date (yyyy-mm-dd)"),
    startTime: z.string().regex(TIME_RE, "startTime must be a 24-hour HH:mm time"),
    endTime: z.string().regex(TIME_RE, "endTime must be a 24-hour HH:mm time"),
  })
  .refine((data) => getWeekDates(data.weekStart).includes(data.date), {
    message: "date must fall within the target week",
    path: ["date"],
  })
  .refine((data) => computeHoursFromTimeRange(data.startTime, data.endTime) > 0, {
    message: "endTime must be strictly after startTime",
    path: ["endTime"],
  });

export type DailyEntryInput = z.infer<typeof dailyEntryInputSchema>;
