import { describe, it, expect } from "vitest";
import { computeStreak, getStreakBadgeText } from "../../utils/streakTracker";
import type { Session } from "../../types";

const DAY = 86400000;

function makeSession(daysAgo: number): Session {
  const ts = Date.now() - daysAgo * DAY;
  return {
    id: crypto.randomUUID(),
    title: `Session ${daysAgo} days ago`,
    questions: [],
    threads: [],
    createdAt: ts,
    updatedAt: ts,
    model: { modelUrl: "", modelId: "test", localId: "test" },
  };
}

describe("SessionsPanel streak badge", () => {
  it("shows a muted badge for an active streak that includes today", () => {
    const sessions = [makeSession(0), makeSession(1), makeSession(2)];
    expect(getStreakBadgeText(computeStreak(sessions))).toBe("🔥 3-day streak");
  });

  it("shows nothing for a single day of journaling", () => {
    expect(getStreakBadgeText(computeStreak([makeSession(0)]))).toBeNull();
  });

  it("shows nothing when there are no sessions", () => {
    expect(getStreakBadgeText(computeStreak([]))).toBeNull();
  });

  it("shows nothing when the user has not journaled today", () => {
    const sessions = [makeSession(1), makeSession(2), makeSession(3)];
    expect(getStreakBadgeText(computeStreak(sessions))).toBeNull();
  });

  it("shows nothing for a broken streak", () => {
    const sessions = [makeSession(3), makeSession(4)];
    expect(getStreakBadgeText(computeStreak(sessions))).toBeNull();
  });
});
