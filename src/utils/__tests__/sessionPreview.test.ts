import { describe, it, expect } from "vitest";
import { firstUserMessage, pickSessionMood } from "../sessionPreview";
import type { Session, MoodEntry, ChatMessage } from "../../types";

const msg = (role: ChatMessage["role"], content: string, ts = 0): ChatMessage => ({
  id: `${role}-${ts}-${content.slice(0, 4)}`,
  role,
  content,
  ts,
});

const makeSession = (over: Partial<Session> = {}): Session => ({
  id: "s1",
  title: "Untitled",
  questions: [],
  threads: [
    {
      id: "t1",
      title: "t",
      messages: [],
      createdAt: 0,
      updatedAt: 0,
    },
  ],
  createdAt: 1000,
  updatedAt: 2000,
  model: { modelUrl: "", modelId: "", localId: "" },
  ...over,
});

const mood = (over: Partial<MoodEntry> = {}): MoodEntry => ({
  id: "m1",
  emotion: "calm",
  intensity: 5,
  contexts: [],
  ts: 1500,
  ...over,
});

describe("firstUserMessage", () => {
  it("returns the first user message, skipping assistant turns", () => {
    const s = makeSession({
      threads: [
        {
          id: "t1",
          title: "t",
          messages: [
            msg("assistant", "Hello there"),
            msg("user", "I had a hard day"),
            msg("user", "but it's okay"),
          ],
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    });
    expect(firstUserMessage(s)).toBe("I had a hard day");
  });

  it("collapses whitespace", () => {
    const s = makeSession({
      threads: [
        {
          id: "t1",
          title: "t",
          messages: [msg("user", "line one\n\n   line   two")],
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    });
    expect(firstUserMessage(s)).toBe("line one line two");
  });

  it("returns empty string when there is no user message", () => {
    const s = makeSession({
      threads: [
        {
          id: "t1",
          title: "t",
          messages: [msg("assistant", "hi")],
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    });
    expect(firstUserMessage(s)).toBe("");
  });
});

describe("pickSessionMood", () => {
  it("prefers a mood linked by sessionId", () => {
    const s = makeSession({ id: "s1" });
    const moods = [
      mood({ id: "a", sessionId: "s1", emotion: "happy", ts: 1200 }),
      mood({ id: "b", emotion: "sad", ts: 1900 }), // in window but unlinked
    ];
    expect(pickSessionMood(s, moods)).toBe("happy");
  });

  it("falls back to a mood within the session time window", () => {
    const s = makeSession({ id: "s1", createdAt: 1000, updatedAt: 2000 });
    const moods = [mood({ id: "b", emotion: "grateful", ts: 1500 })];
    expect(pickSessionMood(s, moods)).toBe("grateful");
  });

  it("uses the most recent linked mood on a tie of relevance", () => {
    const s = makeSession({ id: "s1" });
    const moods = [
      mood({ id: "a", sessionId: "s1", emotion: "happy", ts: 1100 }),
      mood({ id: "c", sessionId: "s1", emotion: "anxious", ts: 1800 }),
    ];
    expect(pickSessionMood(s, moods)).toBe("anxious");
  });

  it("returns null when no mood relates to the session", () => {
    const s = makeSession({ id: "s1", createdAt: 1000, updatedAt: 2000 });
    const moods = [mood({ id: "b", emotion: "sad", ts: 5000 })];
    expect(pickSessionMood(s, moods)).toBeNull();
  });
});
