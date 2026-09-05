const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Parses a `YYYY-MM-DD` calendar-date string as UTC midnight, independent of local timezone. */
function parseIsoDateAsUtcMidnight(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

/** Reads a Date's local wall-clock calendar day, anchored to UTC midnight for arithmetic. */
function localDateAsUtcMidnight(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getStorageDurationDays(
  receivedDate: string,
  checkedOutDate: string | null,
  today: Date = new Date(),
): number {
  const receivedMs = parseIsoDateAsUtcMidnight(receivedDate);
  const endMs = checkedOutDate
    ? parseIsoDateAsUtcMidnight(checkedOutDate)
    : localDateAsUtcMidnight(today);

  return Math.round((endMs - receivedMs) / MS_PER_DAY);
}
