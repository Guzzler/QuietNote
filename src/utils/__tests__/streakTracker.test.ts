import { describe, it, expect, vi, afterEach } from "vitest";
import { computeStreak } from "../streakTracker";
import type { Session } from "../../types";

function makeSession(daysAgo: number, hour = 12): Session {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return {
    id: `s-${daysAgo}-${hour}`,
    title: "Test",
    affirmation: "",
    questions: [],
    threads: [],
    createdAt: d.getTime(),
    updatedAt: d.getTime(),
    model: { modelUrl: "", modelId: "", localId: "" },
  };
}

describe("computeStreak", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 0 streak with no sessions", () => {
    const result = computeStreak([]);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalDays).toBe(0);
    expect(result.journaledToday).toBe(false);
  });

  it("counts consecutive days correctly", () => {
    const sessions = [makeSession(0), makeSession(1), makeSession(2)];
    const result = computeStreak(sessions);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.journaledToday).toBe(true);
  });

  it("handles gap in days (streak resets)", () => {
    const sessions = [makeSession(0), makeSession(1), makeSession(4), makeSession(5)];
    const result = computeStreak(sessions);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
  });

  it("tracks longest streak separately from current", () => {
    // 5-day streak long ago, then a gap, then 2-day current streak
    const sessions = [
      makeSession(0),
      makeSession(1),
      // gap at day 2
      makeSession(3),
      makeSession(4),
      makeSession(5),
      makeSession(6),
      makeSession(7),
    ];
    const result = computeStreak(sessions);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(5);
  });

  it("handles multiple sessions on same day (counts as 1 day)", () => {
    const sessions = [
      makeSession(0, 9),
      makeSession(0, 14),
      makeSession(0, 20),
      makeSession(1),
    ];
    const result = computeStreak(sessions);
    expect(result.totalDays).toBe(2);
    expect(result.currentStreak).toBe(2);
  });

  it("journaledToday is true when there is an entry today", () => {
    const sessions = [makeSession(0)];
    const result = computeStreak(sessions);
    expect(result.journaledToday).toBe(true);
  });

  it("journaledToday is false when last entry was yesterday", () => {
    const sessions = [makeSession(1)];
    const result = computeStreak(sessions);
    expect(result.journaledToday).toBe(false);
    expect(result.currentStreak).toBe(1);
  });

  it("totalDays counts unique days", () => {
    const sessions = [
      makeSession(0),
      makeSession(0, 15),
      makeSession(3),
      makeSession(7),
      makeSession(7, 20),
    ];
    const result = computeStreak(sessions);
    expect(result.totalDays).toBe(3);
  });

  it("returns 0 current streak when last entry was 3 days ago", () => {
    const sessions = [makeSession(3)];
    const result = computeStreak(sessions);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(1);
  });
});
