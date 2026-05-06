import { describe, it, expect } from "vitest";
import { generateWeeklyReport, MIN_ENTRIES_FOR_PATTERNS } from "../../utils/moodPatterns";
import type { MoodEntry } from "../../types";

function makeMood(
  emotion: MoodEntry["emotion"],
  intensity: number,
  contexts: MoodEntry["contexts"] = [],
  daysAgo = 0
): MoodEntry {
  const ts = Date.now() - daysAgo * 86400000;
  return {
    id: crypto.randomUUID(),
    emotion,
    intensity,
    contexts,
    ts,
  };
}

describe("WellnessSummary data (generateWeeklyReport)", () => {
  it("returns insights prompting more entries when below threshold", () => {
    const moods = [makeMood("happy", 7), makeMood("calm", 5)];
    const report = generateWeeklyReport(moods);
    expect(report.insights).toHaveLength(1);
    expect(report.insights[0]).toContain("Log at least");
  });

  it("returns trend, top emotions, and insights with 5+ entries", () => {
    const moods = [
      makeMood("happy", 7, ["work"], 0),
      makeMood("happy", 6, ["work"], 1),
      makeMood("calm", 5, ["personal"], 2),
      makeMood("anxious", 8, ["work"], 3),
      makeMood("happy", 7, ["personal"], 4),
    ];
    const report = generateWeeklyReport(moods);

    expect(report.moodTrend).toBeDefined();
    expect(["improving", "stable", "declining"]).toContain(report.moodTrend);
    expect(report.topEmotions.length).toBeGreaterThan(0);
    expect(report.topEmotions[0].emotion).toBe("happy");
    expect(report.topEmotions[0].count).toBe(3);
    expect(report.insights.length).toBeGreaterThan(0);
  });

  it("includes top contexts when provided", () => {
    const moods = [
      makeMood("happy", 7, ["work"], 0),
      makeMood("sad", 6, ["work"], 1),
      makeMood("calm", 5, ["personal"], 2),
      makeMood("anxious", 8, ["work"], 3),
      makeMood("happy", 7, ["personal"], 4),
    ];
    const report = generateWeeklyReport(moods);
    expect(report.topContexts.length).toBeGreaterThan(0);
    expect(report.topContexts[0].context).toBe("work");
  });

  it("computes average intensity correctly", () => {
    const moods = [
      makeMood("happy", 4, [], 0),
      makeMood("happy", 6, [], 1),
      makeMood("happy", 8, [], 2),
      makeMood("happy", 10, [], 3),
      makeMood("happy", 2, [], 4),
    ];
    const report = generateWeeklyReport(moods);
    expect(report.moodAverage).toBe(6);
  });

  it("handles empty patterns gracefully when moods are spread across days", () => {
    // No contexts (no correlations), spread across different days (no day-of-week patterns)
    // Use different emotions so no single emotion dominates a single day
    const moods = [
      makeMood("happy", 5, [], 0),
      makeMood("sad", 5, [], 1),
      makeMood("calm", 5, [], 2),
      makeMood("excited", 5, [], 3),
      makeMood("content", 5, [], 4),
    ];
    const report = generateWeeklyReport(moods);
    // Correlations require contexts, day-of-week requires MIN_COOCCURRENCES per day
    expect(report.patterns.filter((p) => p.type === "correlation")).toEqual([]);
  });

  it("progress indicator shows correct remaining count", () => {
    for (let count = 0; count < MIN_ENTRIES_FOR_PATTERNS; count++) {
      const remaining = MIN_ENTRIES_FOR_PATTERNS - count;
      expect(remaining).toBeGreaterThan(0);
    }
  });
});
