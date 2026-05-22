import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildContinuityPrompt } from "../continuityPrompt";
import type { Session, MoodEntry } from "../../types";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    title: "Test Session",
    questions: [],
    threads: [
      {
        id: "t1",
        title: "Conversation",
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
        messages: [
          { id: "m1", role: "user", content: "I've been feeling stressed about work lately", ts: Date.now() - 86400000 },
          { id: "m2", role: "assistant", content: "That sounds challenging.", ts: Date.now() - 86400000 },
        ],
      },
    ],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    model: { modelUrl: "", modelId: "", localId: "" },
    ...overrides,
  };
}


describe("buildContinuityPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T10:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null with 0 sessions", () => {
    expect(buildContinuityPrompt([], [])).toBeNull();
  });

  it("returns last-session prompt when most recent session within 7 days", () => {
    const session = makeSession({
      createdAt: Date.now() - 86400000, // 1 day ago
    });
    const result = buildContinuityPrompt([session], []);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("last-session");
    expect(result!.headline).toBe("Pick up where you left off");
    expect(result!.body).toContain("Yesterday");
    expect(result!.suggestedInput).toContain("revisit");
  });

  it("returns null when last session is older than 7 days and no recurring theme", () => {
    const session = makeSession({
      createdAt: Date.now() - 8 * 86400000, // 8 days ago
      threads: [
        {
          id: "t1",
          title: "Conversation",
          createdAt: Date.now() - 8 * 86400000,
          updatedAt: Date.now() - 8 * 86400000,
          messages: [
            { id: "m1", role: "user", content: "hello", ts: Date.now() - 8 * 86400000 },
          ],
        },
      ],
    });
    const result = buildContinuityPrompt([session], []);
    expect(result).toBeNull();
  });

  it("excludes the current session from continuity sources", () => {
    const session = makeSession({ id: "current" });
    const result = buildContinuityPrompt([session], [], "current");
    expect(result).toBeNull();
  });

  it("returns recurring-theme when same theme spans 2+ sessions", () => {
    const sessions = [
      makeSession({
        id: "s1",
        createdAt: Date.now() - 10 * 86400000,
        threads: [{
          id: "t1", title: "Conversation",
          createdAt: Date.now() - 10 * 86400000,
          updatedAt: Date.now() - 10 * 86400000,
          messages: [{ id: "m1", role: "user", content: "I had an argument with my partner about trust and our relationship", ts: Date.now() - 10 * 86400000 }],
        }],
      }),
      makeSession({
        id: "s2",
        createdAt: Date.now() - 9 * 86400000,
        threads: [{
          id: "t2", title: "Conversation",
          createdAt: Date.now() - 9 * 86400000,
          updatedAt: Date.now() - 9 * 86400000,
          messages: [{ id: "m2", role: "user", content: "My relationship with my friend has been strained and I feel lonely", ts: Date.now() - 9 * 86400000 }],
        }],
      }),
    ];
    const result = buildContinuityPrompt(sessions, []);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("recurring-theme");
    expect(result!.headline).toBe("A recurring thread");
  });

  it("returns mood-followup when mood trend is declining", () => {
    const now = Date.now();
    // Need higher negative intensity in recent half vs earlier half for "declining"
    const moods: MoodEntry[] = [
      { id: "m1", emotion: "sad", intensity: 8, contexts: [], ts: now - 1 * 86400000 },
      { id: "m2", emotion: "anxious", intensity: 8, contexts: [], ts: now - 2 * 86400000 },
      { id: "m3", emotion: "sad", intensity: 7, contexts: [], ts: now - 3 * 86400000 },
      { id: "m4", emotion: "happy", intensity: 3, contexts: [], ts: now - 10 * 86400000 },
      { id: "m5", emotion: "content", intensity: 2, contexts: [], ts: now - 11 * 86400000 },
    ];
    const session = makeSession({
      createdAt: Date.now() - 10 * 86400000, // old, no last-session trigger
      threads: [{
        id: "t1", title: "Conversation",
        createdAt: Date.now() - 10 * 86400000,
        updatedAt: Date.now() - 10 * 86400000,
        messages: [{ id: "m1", role: "user", content: "hello world", ts: Date.now() - 10 * 86400000 }],
      }],
    });
    const result = buildContinuityPrompt([session], moods);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("mood-followup");
  });
});
