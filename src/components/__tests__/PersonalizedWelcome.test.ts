import { describe, it, expect, vi, afterEach } from "vitest";
import { analyzeMoodTrend, findTopEmotions } from "../../utils/moodPatterns";
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

// Replicates the personalized welcome logic from ChatPanel
function computePersonalizedWelcome(moods: MoodEntry[], hour: number) {
  let greeting: string;
  let suggestion: { text: string; mode: string } | null = null;

  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
    suggestion = { text: "Start with a morning check-in?", mode: "checkin" };
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good evening";
    suggestion = { text: "Wind down with an evening reflection?", mode: "checkin" };
  } else {
    greeting = "Hello";
  }

  let moodTrend: "improving" | "stable" | "declining" | null = null;
  let topEmotion: string | null = null;

  if (moods.length >= 5) {
    moodTrend = analyzeMoodTrend(moods);
    const top = findTopEmotions(moods, 1);
    if (top.length > 0) topEmotion = top[0].emotion;

    const recentMoods = moods.slice(0, 5);
    const anxiousOrStressed = recentMoods.filter(
      (m) => m.emotion === "anxious" || m.emotion === "frustrated" || m.emotion === "angry"
    );
    if (anxiousOrStressed.length >= 2) {
      suggestion = { text: "Feeling overwhelmed? Try a thought record.", mode: "thoughtrecord" };
    }
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

  it("has no suggestion in the afternoon by default", () => {
    const result = computePersonalizedWelcome([], 14);
    expect(result.suggestion).toBeNull();
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
