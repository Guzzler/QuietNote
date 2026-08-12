import { describe, it, expect, vi, afterEach } from "vitest";
import { analyzeMoodTrend, findTopEmotions } from "../../utils/moodPatterns";
import { buildGreeting, buildWelcomeSuggestion } from "../../utils/welcomeSuggestion";
import type { MoodEntry, MoodEmotion } from "../../types";

function makeMood(
  emotion: MoodEmotion,
  intensity: number,
  daysAgo = 0
): MoodEntry {
  return {
    id: crypto.randomUUID(),
    emotion,
    intensity,
    contexts: [],
    ts: Date.now() - daysAgo * 86400000,
  };
}

// F6 (2026-08-11) — this used to be a hand-copied replica of ChatPanel's
// `useMemo`. A replica cannot catch a change to the real thing, and it did
// not: the suggestion logic it duplicated was the reason the first tester
// never saw Thought Record. The greeting and suggestion now come from the
// same module ChatPanel calls; only the mood-trend plumbing (which stays in
// the component) is still assembled here.
function computePersonalizedWelcome(moods: MoodEntry[], hour: number) {
  const greeting = buildGreeting(hour);
  const suggestion = buildWelcomeSuggestion(hour, moods);

  let moodTrend: "improving" | "stable" | "declining" | null = null;
  let topEmotion: string | null = null;

  if (moods.length >= 5) {
    moodTrend = analyzeMoodTrend(moods);
    const top = findTopEmotions(moods, 1);
    if (top.length > 0) topEmotion = top[0].emotion;
  }

  return { greeting, suggestion, moodTrend, topEmotion, hasMoodData: moods.length > 0 };
}

describe("Personalized Welcome logic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows 'Good morning' greeting between 5-12", () => {
    const result = computePersonalizedWelcome([], 8);
    expect(result.greeting).toBe("Good morning");
  });

  it("shows 'Good afternoon' greeting between 12-17", () => {
    const result = computePersonalizedWelcome([], 14);
    expect(result.greeting).toBe("Good afternoon");
  });

  it("shows 'Good evening' greeting between 17-21", () => {
    const result = computePersonalizedWelcome([], 19);
    expect(result.greeting).toBe("Good evening");
  });

  it("shows 'Hello' greeting late at night", () => {
    const result = computePersonalizedWelcome([], 23);
    expect(result.greeting).toBe("Hello");
  });

  it("suggests morning check-in in the morning", () => {
    const result = computePersonalizedWelcome([], 9);
    expect(result.suggestion).not.toBeNull();
    expect(result.suggestion!.mode).toBe("checkin");
    expect(result.suggestion!.text).toContain("morning");
  });

  it("suggests evening reflection in the evening", () => {
    const result = computePersonalizedWelcome([], 19);
    expect(result.suggestion).not.toBeNull();
    expect(result.suggestion!.mode).toBe("checkin");
    expect(result.suggestion!.text).toContain("Wind down");
  });

  // F6 — this test used to assert `suggestion === null` in the afternoon.
  // The empty slot is the defect: those were the two bands that offered a
  // first-time user nothing at all, and 00:35 (the hour T1 wrote at) is one
  // of them. Field note §B1.
  it("offers the thought record in the afternoon, where nothing was offered before", () => {
    const result = computePersonalizedWelcome([], 14);
    expect(result.suggestion).not.toBeNull();
    expect(result.suggestion!.mode).toBe("thoughtrecord");
  });

  it("shows mood trend when 5+ moods exist", () => {
    const moods = [
      makeMood("happy", 7, 0),
      makeMood("happy", 6, 1),
      makeMood("calm", 5, 2),
      makeMood("happy", 7, 3),
      makeMood("calm", 5, 4),
    ];
    const result = computePersonalizedWelcome(moods, 14);
    expect(result.moodTrend).not.toBeNull();
    expect(result.topEmotion).toBe("happy");
    expect(result.hasMoodData).toBe(true);
  });

  it("shows encouragement when no mood data exists", () => {
    const result = computePersonalizedWelcome([], 14);
    expect(result.hasMoodData).toBe(false);
    expect(result.moodTrend).toBeNull();
  });

  it("suggests thought record when recent moods are anxious/frustrated", () => {
    const moods = [
      makeMood("anxious", 8, 0),
      makeMood("frustrated", 7, 1),
      makeMood("happy", 5, 2),
      makeMood("calm", 5, 3),
      makeMood("happy", 5, 4),
    ];
    const result = computePersonalizedWelcome(moods, 14);
    expect(result.suggestion).not.toBeNull();
    expect(result.suggestion!.mode).toBe("thoughtrecord");
    expect(result.suggestion!.text).toContain("thought record");
  });

  it("does not suggest thought record when only 1 recent anxious mood", () => {
    const moods = [
      makeMood("anxious", 8, 0),
      makeMood("happy", 7, 1),
      makeMood("calm", 5, 2),
      makeMood("happy", 5, 3),
      makeMood("happy", 5, 4),
    ];
    const result = computePersonalizedWelcome(moods, 9);
    // Should keep the time-based suggestion, not override with thought record
    expect(result.suggestion!.mode).toBe("checkin");
  });
});
