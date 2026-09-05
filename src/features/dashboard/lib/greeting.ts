export type TimeOfDay = "morning" | "afternoon" | "evening";

export function getTimeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = now.getHours();

  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}

export function getGreeting(firstName: string, now: Date = new Date()): string {
  const timeOfDay = getTimeOfDay(now);
  const label =
    timeOfDay === "morning"
      ? "Good morning"
      : timeOfDay === "afternoon"
        ? "Good afternoon"
        : "Good evening";

  return `${label}, ${firstName}`;
}
