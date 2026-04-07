import { describe, it, expect } from "vitest";
import {
  analyzeMoodTrend,
  findTopEmotions,
  findTopContexts,
  detectCorrelations,
  generateWeeklyReport,
  MIN_ENTRIES_FOR_PATTERNS,
  MIN_COOCCURRENCES,
} from "../moodPatterns";
import type { MoodEntry } from "../../types";

// ─── Test helpers ───

function makeMood(
  emotion: MoodEntry["emotion"],
  intensity: number,
  contexts: MoodEntry["contexts"] = [],
  ts?: number
): MoodEntry {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    emotion,
    intensity,
    contexts,
    ts: ts ?? Date.now(),
  };
}

const DAY_MS = 86_400_000;

// ─── analyzeMoodTrend ───

describe("analyzeMoodTrend", () => {
  it('returns "stable" for empty data', () => {
    expect(analyzeMoodTrend([])).toBe("stable");
  });

  it('returns "stable" for insufficient data', () => {
    const moods = [makeMood("sad", 8), makeMood("sad", 9)];
    expect(analyzeMoodTrend(moods)).toBe("stable");
  });

  it('detects "declining" trend (increasing negative intensity)', () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("sad", 3, [], now - 5 * DAY_MS),
      makeMood("anxious", 2, [], now - 4 * DAY_MS),
      makeMood("sad", 4, [], now - 3 * DAY_MS),
      makeMood("anxious", 7, [], now - 2 * DAY_MS),
      makeMood("sad", 8, [], now - 1 * DAY_MS),
      makeMood("angry", 9, [], now),
    ];
    expect(analyzeMoodTrend(moods)).toBe("declining");
  });

  it('detects "improving" trend (decreasing negative intensity)', () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("sad", 9, [], now - 5 * DAY_MS),
      makeMood("anxious", 8, [], now - 4 * DAY_MS),
      makeMood("sad", 7, [], now - 3 * DAY_MS),
      makeMood("anxious", 3, [], now - 2 * DAY_MS),
      makeMood("sad", 2, [], now - 1 * DAY_MS),
      makeMood("sad", 2, [], now),
    ];
    expect(analyzeMoodTrend(moods)).toBe("improving");
  });

  it('returns "stable" when all emotions are positive', () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("happy", 5, [], now - 5 * DAY_MS),
      makeMood("calm", 6, [], now - 4 * DAY_MS),
      makeMood("content", 7, [], now - 3 * DAY_MS),
      makeMood("grateful", 8, [], now - 2 * DAY_MS),
      makeMood("excited", 9, [], now - 1 * DAY_MS),
    ];
    expect(analyzeMoodTrend(moods)).toBe("stable");
  });

  it('returns "stable" when negative intensity is consistent', () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("sad", 5, [], now - 5 * DAY_MS),
      makeMood("anxious", 5, [], now - 4 * DAY_MS),
      makeMood("sad", 5, [], now - 3 * DAY_MS),
      makeMood("anxious", 5, [], now - 2 * DAY_MS),
      makeMood("sad", 5, [], now - 1 * DAY_MS),
    ];
    expect(analyzeMoodTrend(moods)).toBe("stable");
  });
});

// ─── findTopEmotions ───

describe("findTopEmotions", () => {
  it("returns empty for no moods", () => {
    expect(findTopEmotions([])).toEqual([]);
  });

  it("counts emotions correctly", () => {
    const moods = [
      makeMood("happy", 5),
      makeMood("happy", 6),
      makeMood("happy", 7),
      makeMood("sad", 5),
      makeMood("sad", 6),
      makeMood("anxious", 5),
    ];
    const top = findTopEmotions(moods, 3);
    expect(top[0]).toEqual({ emotion: "happy", count: 3 });
    expect(top[1]).toEqual({ emotion: "sad", count: 2 });
    expect(top[2]).toEqual({ emotion: "anxious", count: 1 });
  });

  it("respects limit parameter", () => {
    const moods = [
      makeMood("happy", 5),
      makeMood("sad", 5),
      makeMood("anxious", 5),
      makeMood("angry", 5),
    ];
    const top = findTopEmotions(moods, 2);
    expect(top.length).toBe(2);
  });

  it("handles single entry", () => {
    const moods = [makeMood("calm", 5)];
    const top = findTopEmotions(moods);
    expect(top).toEqual([{ emotion: "calm", count: 1 }]);
  });

  it("handles all same emotion", () => {
    const moods = [
      makeMood("anxious", 3),
      makeMood("anxious", 5),
      makeMood("anxious", 7),
    ];
    const top = findTopEmotions(moods);
    expect(top).toEqual([{ emotion: "anxious", count: 3 }]);
  });
});

// ─── findTopContexts ───

describe("findTopContexts", () => {
  it("returns empty for no moods", () => {
    expect(findTopContexts([])).toEqual([]);
  });

  it("counts contexts across moods", () => {
    const moods = [
      makeMood("sad", 5, ["work", "health"]),
      makeMood("anxious", 5, ["work"]),
      makeMood("sad", 5, ["work", "relationships"]),
    ];
    const top = findTopContexts(moods, 3);
    expect(top[0]).toEqual({ context: "work", count: 3 });
    expect(top.find((t) => t.context === "health")?.count).toBe(1);
    expect(top.find((t) => t.context === "relationships")?.count).toBe(1);
  });

  it("handles moods with no contexts", () => {
    const moods = [makeMood("happy", 5, [])];
    expect(findTopContexts(moods)).toEqual([]);
  });
});

// ─── detectCorrelations ───

describe("detectCorrelations", () => {
  it("returns empty for insufficient data", () => {
    const moods = [makeMood("sad", 5, ["work"])];
    expect(detectCorrelations(moods)).toEqual([]);
  });

  it("detects strong emotion-context correlations", () => {
    const moods = [
      makeMood("anxious", 7, ["work"]),
      makeMood("anxious", 6, ["work"]),
      makeMood("anxious", 8, ["work"]),
      makeMood("happy", 5, ["friends"]),
      makeMood("happy", 6, ["friends"]),
    ];
    const correlations = detectCorrelations(moods);
    expect(correlations.length).toBeGreaterThanOrEqual(1);

    const anxiousWork = correlations.find(
      (c) => c.data.emotion === "anxious" && c.data.context === "work"
    );
    expect(anxiousWork).toBeDefined();
    expect(anxiousWork!.type).toBe("correlation");
    expect(anxiousWork!.description).toContain("anxious");
    expect(anxiousWork!.description).toContain("work");
  });

  it("requires minimum co-occurrences", () => {
    const moods = [
      makeMood("sad", 5, ["work"]),
      makeMood("sad", 5, ["work"]),
      makeMood("happy", 5, ["friends"]),
      makeMood("calm", 5, ["personal"]),
      makeMood("anxious", 5, ["health"]),
    ];
    const correlations = detectCorrelations(moods);
    // sad+work only appears 2 times, below MIN_COOCCURRENCES of 3
    expect(correlations.length).toBe(0);
  });

  it("uses observational language in descriptions", () => {
    const moods = [
      makeMood("anxious", 7, ["work"]),
      makeMood("anxious", 6, ["work"]),
      makeMood("anxious", 8, ["work"]),
      makeMood("happy", 5, ["friends"]),
      makeMood("happy", 5, ["friends"]),
    ];
    const correlations = detectCorrelations(moods);
    for (const c of correlations) {
      expect(c.description).toContain("You logged");
      expect(c.description).not.toContain("You have");
      expect(c.description).not.toContain("You are");
      expect(c.description).not.toContain("diagnosis");
    }
  });
});

// ─── generateWeeklyReport ───

describe("generateWeeklyReport", () => {
  it("generates report for empty data", () => {
    const report = generateWeeklyReport([]);
    expect(report.moodTrend).toBe("stable");
    expect(report.moodAverage).toBe(0);
    expect(report.topEmotions).toEqual([]);
    expect(report.topContexts).toEqual([]);
    expect(report.patterns).toEqual([]);
    expect(report.insights.length).toBeGreaterThan(0);
  });

  it("generates report for single entry", () => {
    const moods = [makeMood("happy", 7, ["friends"])];
    const report = generateWeeklyReport(moods);
    expect(report.moodAverage).toBe(7);
    expect(report.topEmotions).toEqual([{ emotion: "happy", count: 1 }]);
    expect(report.insights.some((i) => i.includes("1 mood entry"))).toBe(true);
  });

  it("generates comprehensive report with sufficient data", () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("anxious", 7, ["work"], now - 6 * DAY_MS),
      makeMood("anxious", 6, ["work"], now - 5 * DAY_MS),
      makeMood("anxious", 8, ["work"], now - 4 * DAY_MS),
      makeMood("sad", 5, ["relationships"], now - 3 * DAY_MS),
      makeMood("happy", 6, ["friends"], now - 2 * DAY_MS),
      makeMood("calm", 4, ["personal"], now - 1 * DAY_MS),
    ];
    const report = generateWeeklyReport(moods);

    expect(report.moodTrend).toBeDefined();
    expect(report.moodAverage).toBeGreaterThan(0);
    expect(report.topEmotions.length).toBeGreaterThan(0);
    expect(report.topEmotions[0].emotion).toBe("anxious");
    expect(report.topContexts.length).toBeGreaterThan(0);
    expect(report.topContexts[0].context).toBe("work");
    expect(report.insights.length).toBeGreaterThan(0);
    expect(report.id).toContain("report-");
    expect(report.generatedAt).toBeGreaterThan(0);
    expect(report.journalCount).toBe(0);
    expect(report.thoughtRecordCount).toBe(0);
  });

  it("includes pattern count in insights when patterns exist", () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("anxious", 7, ["work"], now - 6 * DAY_MS),
      makeMood("anxious", 6, ["work"], now - 5 * DAY_MS),
      makeMood("anxious", 8, ["work"], now - 4 * DAY_MS),
      makeMood("sad", 5, ["work"], now - 3 * DAY_MS),
      makeMood("happy", 6, ["friends"], now - 2 * DAY_MS),
    ];
    const report = generateWeeklyReport(moods);

    if (report.patterns.length > 0) {
      expect(
        report.insights.some((i) => i.includes("pattern"))
      ).toBe(true);
    }
  });

  it("uses custom period start and end", () => {
    const start = Date.now() - 7 * DAY_MS;
    const end = Date.now();
    const report = generateWeeklyReport([], start, end);
    expect(report.periodStart).toBe(start);
    expect(report.periodEnd).toBe(end);
  });

  it("never uses diagnostic language in insights", () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("sad", 9, ["work"], now - 5 * DAY_MS),
      makeMood("sad", 8, ["work"], now - 4 * DAY_MS),
      makeMood("anxious", 7, ["work"], now - 3 * DAY_MS),
      makeMood("sad", 8, ["work"], now - 2 * DAY_MS),
      makeMood("sad", 9, ["work"], now - 1 * DAY_MS),
    ];
    const report = generateWeeklyReport(moods);

    for (const insight of report.insights) {
      expect(insight).not.toContain("You have depression");
      expect(insight).not.toContain("You are depressed");
      expect(insight).not.toContain("diagnosis");
      expect(insight).not.toContain("disorder");
      expect(insight).not.toContain("clinical");
    }
  });

  it("includes supportive note for declining trend", () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("sad", 2, [], now - 5 * DAY_MS),
      makeMood("anxious", 3, [], now - 4 * DAY_MS),
      makeMood("sad", 4, [], now - 3 * DAY_MS),
      makeMood("anxious", 7, [], now - 2 * DAY_MS),
      makeMood("sad", 8, [], now - 1 * DAY_MS),
      makeMood("angry", 9, [], now),
    ];
    const report = generateWeeklyReport(moods);

    if (report.moodTrend === "declining") {
      expect(
        report.insights.some((i) => i.includes("support"))
      ).toBe(true);
    }
  });
});

// ─── Constants ───

describe("constants", () => {
  it("MIN_ENTRIES_FOR_PATTERNS is reasonable", () => {
    expect(MIN_ENTRIES_FOR_PATTERNS).toBeGreaterThanOrEqual(3);
    expect(MIN_ENTRIES_FOR_PATTERNS).toBeLessThanOrEqual(10);
  });

  it("MIN_COOCCURRENCES is reasonable", () => {
    expect(MIN_COOCCURRENCES).toBeGreaterThanOrEqual(2);
    expect(MIN_COOCCURRENCES).toBeLessThanOrEqual(5);
  });
});
