import { describe, it, expect } from "vitest";
import { formatRelative } from "../relativeTime";

// Fixed reference "now": Sun Jun 14 2026, 21:00 local time.
const NOW = new Date(2026, 5, 14, 21, 0, 0).getTime();
const sec = 1000;
const min = 60 * sec;
const hour = 60 * min;
const day = 24 * hour;

describe("formatRelative", () => {
  it("reads 'Just now' under a minute", () => {
    expect(formatRelative(NOW - 30 * sec, NOW)).toBe("Just now");
    expect(formatRelative(NOW, NOW)).toBe("Just now");
  });

  it("formats minutes", () => {
    expect(formatRelative(NOW - 5 * min, NOW)).toBe("5m ago");
  });

  it("formats hours", () => {
    expect(formatRelative(NOW - 3 * hour, NOW)).toBe("3h ago");
  });

  it("reads 'Yesterday' across a calendar boundary, not raw 24h", () => {
    // 11pm yesterday is < 24h before 9pm today is false here, but still a prior
    // calendar day -> "Yesterday". Use a point ~22h earlier on Jun 13.
    const yesterdayLate = new Date(2026, 5, 13, 23, 0, 0).getTime();
    expect(formatRelative(yesterdayLate, NOW)).toBe("Yesterday");
  });

  it("formats days within a week", () => {
    expect(formatRelative(NOW - 4 * day, NOW)).toBe("4d ago");
  });

  it("formats a same-year absolute date without the year", () => {
    const older = new Date(2026, 4, 2, 12, 0, 0).getTime(); // May 2
    const out = formatRelative(older, NOW);
    expect(out).toContain("May");
    expect(out).toContain("2");
    expect(out).not.toContain("2026");
  });

  it("formats a prior-year date with the year", () => {
    const lastYear = new Date(2025, 11, 25, 12, 0, 0).getTime(); // Dec 25 2025
    const out = formatRelative(lastYear, NOW);
    expect(out).toContain("2025");
  });
});
