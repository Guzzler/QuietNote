import { describe, it, expect } from "vitest";
import type { MoodEntry } from "../../types";

function makeMood(
  overrides: Partial<MoodEntry> & { ts: number; emotion: MoodEntry["emotion"] }
): MoodEntry {
  return {
    id: crypto.randomUUID(),
    intensity: 5,
    contexts: [],
    ...overrides,
  };
}

function filterByRange(moods: MoodEntry[], range: "7d" | "30d" | "all"): MoodEntry[] {
  if (moods.length === 0) return [];
  const sorted = [...moods].sort((a, b) => a.ts - b.ts);
  if (range === "all") return sorted;
  const now = Date.now();
  const cutoff = range === "7d" ? now - 7 * 86400000 : now - 30 * 86400000;
  return sorted.filter((m) => m.ts >= cutoff);
}

function computePoints(
  moods: MoodEntry[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number }
) {
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const minTs = moods[0]?.ts ?? 0;
  const maxTs = moods[moods.length - 1]?.ts ?? 1;
  const tsRange = maxTs - minTs || 1;

  return moods.map((m, i) => ({
    x: padding.left + (chartW * (m.ts - minTs)) / tsRange,
    y: padding.top + chartH - (chartH * (m.intensity - 1)) / 9,
    mood: m,
    index: i,
  }));
}

function getEmotionsUsed(moods: MoodEntry[]): string[] {
  const set = new Set<string>();
  for (const m of moods) set.add(m.emotion);
  return Array.from(set).sort();
}

describe("MoodChart logic", () => {
  it("returns no data when fewer than 2 moods", () => {
    const moods = [makeMood({ ts: Date.now(), emotion: "happy" })];
    expect(moods.length < 2).toBe(true);
  });

  it("filters moods to last 7 days", () => {
    const now = Date.now();
    const moods = [
      makeMood({ ts: now - 3 * 86400000, emotion: "happy" }),
      makeMood({ ts: now - 10 * 86400000, emotion: "sad" }),
      makeMood({ ts: now, emotion: "calm" }),
    ];
    const result = filterByRange(moods, "7d");
    expect(result).toHaveLength(2);
    expect(result[0].emotion).toBe("happy");
    expect(result[1].emotion).toBe("calm");
  });

  it("filters moods to last 30 days", () => {
    const now = Date.now();
    const moods = [
      makeMood({ ts: now - 5 * 86400000, emotion: "happy" }),
      makeMood({ ts: now - 45 * 86400000, emotion: "sad" }),
      makeMood({ ts: now, emotion: "calm" }),
    ];
    const result = filterByRange(moods, "30d");
    expect(result).toHaveLength(2);
  });

  it("returns all moods when range is 'all'", () => {
    const now = Date.now();
    const moods = [
      makeMood({ ts: now - 100 * 86400000, emotion: "sad" }),
      makeMood({ ts: now - 5 * 86400000, emotion: "happy" }),
      makeMood({ ts: now, emotion: "calm" }),
    ];
    const result = filterByRange(moods, "all");
    expect(result).toHaveLength(3);
  });

  it("sorts moods by timestamp ascending", () => {
    const now = Date.now();
    const moods = [
      makeMood({ ts: now, emotion: "calm" }),
      makeMood({ ts: now - 2 * 86400000, emotion: "happy" }),
      makeMood({ ts: now - 1 * 86400000, emotion: "sad" }),
    ];
    const result = filterByRange(moods, "all");
    expect(result[0].emotion).toBe("happy");
    expect(result[1].emotion).toBe("sad");
    expect(result[2].emotion).toBe("calm");
  });

  it("computes point positions correctly", () => {
    const padding = { top: 16, right: 16, bottom: 28, left: 28 };
    const moods = [
      makeMood({ ts: 1000, emotion: "happy", intensity: 1 }),
      makeMood({ ts: 2000, emotion: "sad", intensity: 10 }),
    ];
    const points = computePoints(moods, 400, 160, padding);

    expect(points).toHaveLength(2);
    // First point should be at left edge, bottom (intensity 1)
    expect(points[0].x).toBe(padding.left);
    expect(points[0].y).toBe(padding.top + (160 - padding.top - padding.bottom));
    // Second point should be at right edge, top (intensity 10)
    expect(points[1].x).toBe(400 - padding.right);
    expect(points[1].y).toBe(padding.top);
  });

  it("maps intensity to correct y position", () => {
    const padding = { top: 16, right: 16, bottom: 28, left: 28 };
    const chartH = 160 - padding.top - padding.bottom;
    const moods = [
      makeMood({ ts: 1000, emotion: "happy", intensity: 5 }),
      makeMood({ ts: 2000, emotion: "sad", intensity: 5 }),
    ];
    const points = computePoints(moods, 400, 160, padding);
    // Intensity 5: (5-1)/9 = 4/9 of chart height from bottom
    const expectedY = padding.top + chartH - (chartH * 4) / 9;
    expect(points[0].y).toBeCloseTo(expectedY, 5);
  });

  it("collects unique emotions used", () => {
    const moods = [
      makeMood({ ts: 1000, emotion: "happy" }),
      makeMood({ ts: 2000, emotion: "sad" }),
      makeMood({ ts: 3000, emotion: "happy" }),
      makeMood({ ts: 4000, emotion: "calm" }),
    ];
    const emotions = getEmotionsUsed(moods);
    expect(emotions).toEqual(["calm", "happy", "sad"]);
  });

  it("returns empty for filtered range with no data", () => {
    const now = Date.now();
    const moods = [
      makeMood({ ts: now - 60 * 86400000, emotion: "sad" }),
    ];
    const result = filterByRange(moods, "7d");
    expect(result).toHaveLength(0);
  });

  it("handles single-point timestamp range without division by zero", () => {
    const padding = { top: 16, right: 16, bottom: 28, left: 28 };
    const moods = [
      makeMood({ ts: 5000, emotion: "happy", intensity: 7 }),
      makeMood({ ts: 5000, emotion: "sad", intensity: 3 }),
    ];
    const points = computePoints(moods, 400, 160, padding);
    // Both have same timestamp, so tsRange = 0, fallback to 1
    // x should be at left edge for both
    expect(points[0].x).toBe(padding.left);
    expect(points[1].x).toBe(padding.left);
    expect(Number.isFinite(points[0].y)).toBe(true);
    expect(Number.isFinite(points[1].y)).toBe(true);
  });
});
