// Journal-friendly "when" labels for the Sessions index.
//
// Pure and deterministic given `now`. The recent buckets (< 7 days) are
// string-built so unit tests stay locale-stable; only the absolute fallback
// uses Intl date formatting.
//
//   < 60s            -> "Just now"
//   < 60m            -> "{n}m ago"
//   < 24h            -> "{n}h ago"
//   yesterday (cal.) -> "Yesterday"
//   < 7 days         -> "{n}d ago"
//   same cal. year   -> "Mmm D"        (e.g. "Jun 14")
//   else             -> "Mmm D, YYYY"

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Local calendar day index (days since epoch in the local timezone). */
function calendarDay(ts: number): number {
  const d = new Date(ts);
  return Math.floor(
    (d.getTime() - d.getTimezoneOffset() * MINUTE) / (24 * HOUR)
  );
}

export function formatRelative(ts: number, now: number = Date.now()): string {
  const diff = now - ts;

  // Future or right-now timestamps read as "Just now" rather than negatives.
  if (diff < MINUTE) return "Just now";

  // Calendar-day boundaries take precedence over the hour bucket so that a
  // timestamp late on the previous day reads "Yesterday" even when it is < 24h
  // old (e.g. 11pm -> 1am next day).
  const dayDelta = calendarDay(now) - calendarDay(ts);
  if (dayDelta === 0) {
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
    return `${Math.floor(diff / HOUR)}h ago`;
  }
  if (dayDelta === 1) return "Yesterday";
  if (dayDelta < 7) return `${dayDelta}d ago`;

  const then = new Date(ts);
  const sameYear = then.getFullYear() === new Date(now).getFullYear();
  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
