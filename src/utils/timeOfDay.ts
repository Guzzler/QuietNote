export type TimeBucket = "morning" | "afternoon" | "evening" | "night";

export function currentTimeBucket(now: Date = new Date()): TimeBucket {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}
