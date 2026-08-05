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
    expect(result!.suggestedInput).toContain("come back to that");
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

  describe("last-session fragment (R5 — the card quotes the user's own words)", () => {
    function cardFor(entry: string) {
      const ts = Date.now() - 86400000;
      const session = makeSession({
        createdAt: ts,
        threads: [{
          id: "t1", title: "Conversation", createdAt: ts, updatedAt: ts,
          messages: [{ id: "m1", role: "user", content: entry, ts }],
        }],
      });
      const result = buildContinuityPrompt([session], []);
      expect(result).not.toBeNull();
      expect(result!.kind).toBe("last-session");
      return result!;
    }

    it("cuts an entry longer than 8 words and ends it with an ellipsis", () => {
      const card = cardFor("My sister called tonight to say our dad is back in hospital");
      expect(card.body).toContain("“My sister called tonight to say our dad…”");
      expect(card.body).not.toContain("….");
      expect(card.suggestedInput).toContain("“My sister called tonight to say our dad…”");
    });

    it("keeps a short entry's own punctuation and adds no ellipsis", () => {
      const card = cardFor("Today felt heavy.");
      expect(card.body).toBe(
        "Yesterday, you wrote: “Today felt heavy.” How are you feeling about that today?"
      );
      expect(card.body).not.toContain("…");
    });

    it("strips punctuation from the last kept word before truncating", () => {
      const card = cardFor("I quit my job today, and I have no idea what comes next");
      expect(card.body).toContain("“I quit my job today, and I have…”");
      expect(card.body).not.toContain("have,…");
    });

    it("caps a pathologically long fragment at a word boundary", () => {
      const card = cardFor(
        "Absolutely everything overwhelming complicated frustrating exhausting disappointing bewildering unbelievable nonsense"
      );
      const fragment = card.body.slice(card.body.indexOf("“") + 1, card.body.lastIndexOf("”"));
      expect(fragment.length).toBeLessThanOrEqual(81); // 80 chars + the ellipsis
      expect(fragment.endsWith("…")).toBe(true);
      expect(fragment).not.toContain("  ");
    });

    it("never produces a double-punctuated join and keeps quotes balanced", () => {
      for (const entry of [
        "Today felt heavy.",
        "My sister called tonight to say our dad is back in hospital",
        "I quit my job today, and I have no idea what comes next",
        "ok",
      ]) {
        const card = cardFor(entry);
        for (const text of [card.body, card.suggestedInput]) {
          expect(text).not.toMatch(/…["”]?\./);
          expect(text.split("“").length).toBe(2);
          expect(text.split("”").length).toBe(2);
        }
      }
    });
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
