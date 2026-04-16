import { describe, it, expect } from "vitest";
import type { Session } from "../../types";

// Test the session filtering logic used by SessionsPanel

function filterSessions(sessions: Session[], query: string): Session[] {
  if (!query.trim()) return sessions;
  const q = query.toLowerCase();
  return sessions.filter((s) => {
    if (s.title.toLowerCase().includes(q)) return true;
    const firstMsg = s.threads[0]?.messages?.find((m) => m.role === "user");
    if (firstMsg?.content.toLowerCase().includes(q)) return true;
    return false;
  });
}

function makeSession(title: string, firstMessage?: string): Session {
  return {
    id: crypto.randomUUID(),
    title,
    questions: [],
    threads: [
      {
        id: crypto.randomUUID(),
        title: "Conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: firstMessage
          ? [{ id: crypto.randomUUID(), role: "user" as const, content: firstMessage, ts: Date.now() }]
          : [],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: { modelUrl: "", modelId: "", localId: "" },
  };
}

describe("Session search filtering", () => {
  const sessions = [
    makeSession("Morning reflection", "I woke up feeling grateful today"),
    makeSession("Work stress", "My boss gave me a really tough deadline"),
    makeSession("Evening calm", "Went for a walk by the river"),
  ];

  it("returns all sessions when query is empty", () => {
    expect(filterSessions(sessions, "")).toEqual(sessions);
    expect(filterSessions(sessions, "  ")).toEqual(sessions);
  });

  it("filters by title match", () => {
    const result = filterSessions(sessions, "morning");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Morning reflection");
  });

  it("filters by first message content", () => {
    const result = filterSessions(sessions, "deadline");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Work stress");
  });

  it("is case-insensitive", () => {
    const result = filterSessions(sessions, "WALK");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Evening calm");
  });

  it("returns empty when no match", () => {
    const result = filterSessions(sessions, "zzzznonexistent");
    expect(result).toHaveLength(0);
  });

  it("matches partial title substrings", () => {
    const result = filterSessions(sessions, "stress");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Work stress");
  });

  it("returns multiple matches", () => {
    // "e" appears in all three titles
    const result = filterSessions(sessions, "e");
    expect(result).toHaveLength(3);
  });

  it("handles sessions with no messages gracefully", () => {
    const emptySession = makeSession("Empty session");
    emptySession.threads[0].messages = [];
    const result = filterSessions([emptySession], "anything");
    expect(result).toHaveLength(0);
  });
});
