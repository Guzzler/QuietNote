import { describe, it, expect } from "vitest";
import type { MoodEntry } from "../../types";

// Test the grouping and display logic used by MoodHistoryPanel

function getDateGroup(ts: number): string {
  const now = new Date();
  const date = new Date(ts);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This Week";
  return "Earlier";
}

function groupMoods(moods: MoodEntry[]) {
  const groups: Record<string, MoodEntry[]> = {};
  const order = ["Today", "Yesterday", "This Week", "Earlier"];

  for (const mood of moods) {
    const group = getDateGroup(mood.ts);
    if (!groups[group]) groups[group] = [];
    groups[group].push(mood);
  }

  return order
    .filter((g) => groups[g]?.length)
    .map((label) => ({ label, entries: groups[label] }));
}

function makeMood(overrides: Partial<MoodEntry> & { ts: number; emotion: MoodEntry["emotion"] }): MoodEntry {
  const { emotion, intensity, contexts, ts, ...rest } = overrides;
  return {
    id: crypto.randomUUID(),
    emotion,
    intensity: intensity ?? 5,
    contexts: contexts ?? [],
    ts,
    ...rest,
  };
}

describe("MoodHistoryPanel grouping logic", () => {
  it("returns empty array for no moods", () => {
    const result = groupMoods([]);
    expect(result).toEqual([]);
  });

  it("groups a mood from today as 'Today'", () => {
    const mood = makeMood({ ts: Date.now(), emotion: "happy" });
    const result = groupMoods([mood]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Today");
    expect(result[0].entries).toHaveLength(1);
  });

  it("groups a mood from yesterday as 'Yesterday'", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const mood = makeMood({ ts: yesterday.getTime(), emotion: "sad" });
    const result = groupMoods([mood]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Yesterday");
  });

  it("groups a mood from 3 days ago as 'This Week'", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(12, 0, 0, 0);
    const mood = makeMood({ ts: threeDaysAgo.getTime(), emotion: "anxious" });
    const result = groupMoods([mood]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("This Week");
  });

  it("groups a mood from 2 weeks ago as 'Earlier'", () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const mood = makeMood({ ts: twoWeeksAgo.getTime(), emotion: "calm" });
    const result = groupMoods([mood]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Earlier");
  });

  it("groups multiple moods into correct buckets in order", () => {
    // Anchor "now" to midday: with a raw Date.now(), `now - 3600000` falls on
    // the previous day when the test runs between 00:00 and 01:00, collapsing
    // the Today bucket to one entry (flaked in the 2026-07-16 00:06 run).
    const nowDate = new Date();
    nowDate.setHours(12, 0, 0, 0);
    const now = nowDate.getTime();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 5);
    lastWeek.setHours(12, 0, 0, 0);

    const moods = [
      makeMood({ ts: now, emotion: "happy" }),
      makeMood({ ts: now - 3600000, emotion: "excited" }),
      makeMood({ ts: yesterday.getTime(), emotion: "sad" }),
      makeMood({ ts: lastWeek.getTime(), emotion: "calm" }),
    ];

    const result = groupMoods(moods);
    expect(result).toHaveLength(3);
    expect(result[0].label).toBe("Today");
    expect(result[0].entries).toHaveLength(2);
    expect(result[1].label).toBe("Yesterday");
    expect(result[1].entries).toHaveLength(1);
    expect(result[2].label).toBe("This Week");
    expect(result[2].entries).toHaveLength(1);
  });

  it("preserves mood data including note and contexts", () => {
    const mood = makeMood({
      ts: Date.now(),
      emotion: "grateful",
      intensity: 8,
      contexts: ["work", "personal"],
      note: "Great day at work",
    });
    const result = groupMoods([mood]);
    const entry = result[0].entries[0];
    expect(entry.emotion).toBe("grateful");
    expect(entry.intensity).toBe(8);
    expect(entry.contexts).toEqual(["work", "personal"]);
    expect(entry.note).toBe("Great day at work");
  });
});
