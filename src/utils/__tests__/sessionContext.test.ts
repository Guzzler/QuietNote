import { describe, it, expect } from "vitest";
import { buildSessionContext, formatContextForPrompt } from "../sessionContext";
import type { Session, MoodEntry } from "../../types";

function makeSession(overrides: Partial<Session> & { id: string; createdAt: number }): Session {
  return {
    title: "Test",
    affirmation: "",
    questions: [],
    threads: [
      {
        id: "t1",
        title: "Conversation",
        createdAt: overrides.createdAt,
        updatedAt: overrides.createdAt,
        messages: [],
      },
    ],
    updatedAt: overrides.createdAt,
    model: { modelUrl: "", modelId: "", localId: "" },
    ...overrides,
  };
}

function withUserMessage(session: Session, content: string): Session {
  return {
    ...session,
    threads: [
      {
        ...session.threads[0],
        messages: [
          ...session.threads[0].messages,
          { id: `m-${Date.now()}`, role: "user", content, ts: session.createdAt },
        ],
      },
    ],
  };
}

function makeMood(emotion: MoodEntry["emotion"], ts: number, intensity = 5): MoodEntry {
  return { id: `mood-${ts}`, emotion, intensity, contexts: [], ts };
}

describe("buildSessionContext", () => {
  it("returns empty context when no prior sessions", () => {
    const ctx = buildSessionContext([], []);
    expect(ctx.recentThemes).toEqual([]);
    expect(ctx.recentEmotions).toEqual([]);
    expect(ctx.lastSessionSummary).toBe("");
    expect(ctx.journalDays).toBe(0);
    expect(ctx.moodTrend).toBeNull();
  });

  it("excludes the current session from context", () => {
    const s1 = withUserMessage(
      makeSession({ id: "s1", createdAt: Date.now() - 86400000 }),
      "I feel grateful for my family"
    );
    const s2 = withUserMessage(
      makeSession({ id: "s2", createdAt: Date.now() }),
      "I am struggling with work stress"
    );

    const ctx = buildSessionContext([s1, s2], [], "s2");
    expect(ctx.lastSessionSummary).toContain("grateful");
    expect(ctx.lastSessionSummary).not.toContain("struggling");
  });

  it("extracts themes from user messages in recent sessions", () => {
    const s1 = withUserMessage(
      makeSession({ id: "s1", createdAt: Date.now() - 86400000 }),
      "I had a fight with my partner about trust"
    );

    const ctx = buildSessionContext([s1], []);
    expect(ctx.recentThemes).toContain("relationships");
  });

  it("limits to last 3 sessions", () => {
    const sessions = [1, 2, 3, 4, 5].map((i) =>
      withUserMessage(
        makeSession({ id: `s${i}`, createdAt: Date.now() - i * 86400000 }),
        `Session ${i} about goals and ambition`
      )
    );

    const ctx = buildSessionContext(sessions, []);
    expect(ctx.journalDays).toBe(5);
  });

  it("includes mood trend when moods are available", () => {
    const now = Date.now();
    const moods: MoodEntry[] = [
      makeMood("sad", now - 5 * 86400000, 8),
      makeMood("sad", now - 4 * 86400000, 7),
      makeMood("sad", now - 3 * 86400000, 6),
      makeMood("calm", now - 2 * 86400000, 5),
      makeMood("happy", now - 86400000, 4),
    ];

    const ctx = buildSessionContext([], moods);
    expect(ctx.moodTrend).not.toBeNull();
  });

  it("returns null mood trend with fewer than 5 moods", () => {
    const moods = [makeMood("happy", Date.now(), 5), makeMood("calm", Date.now() - 86400000, 6)];
    const ctx = buildSessionContext([], moods);
    expect(ctx.moodTrend).toBeNull();
  });

  it("handles sessions with no user messages gracefully", () => {
    const s1 = makeSession({ id: "s1", createdAt: Date.now() - 86400000 });
    const ctx = buildSessionContext([s1], []);
    expect(ctx.lastSessionSummary).toBe("");
    expect(ctx.journalDays).toBe(1);
  });
});

describe("formatContextForPrompt", () => {
  it("returns empty string when no prior data", () => {
    const result = formatContextForPrompt({
      recentThemes: [],
      recentEmotions: [],
      lastSessionSummary: "",
      journalDays: 0,
      moodTrend: null,
    });
    expect(result).toBe("");
  });

  it("includes journal days count", () => {
    const result = formatContextForPrompt({
      recentThemes: [],
      recentEmotions: [],
      lastSessionSummary: "",
      journalDays: 5,
      moodTrend: null,
    });
    expect(result).toContain("5 days");
  });

  it("includes themes and mood trend", () => {
    const result = formatContextForPrompt({
      recentThemes: ["relationships", "challenges"],
      recentEmotions: ["anxious"],
      lastSessionSummary: "",
      journalDays: 3,
      moodTrend: "improving",
    });
    expect(result).toContain("relationships and challenges");
    expect(result).toContain("improving");
  });

  it("keeps output concise", () => {
    const result = formatContextForPrompt({
      recentThemes: ["goals", "growth", "creativity"],
      recentEmotions: ["happy", "excited"],
      lastSessionSummary: 'Yesterday, they wrote about: "planning my next career move"',
      journalDays: 10,
      moodTrend: "stable",
    });
    expect(result.length).toBeLessThan(350);
  });
});
