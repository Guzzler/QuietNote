import { describe, it, expect } from "vitest";
import { generateReflection, shouldRegenerate } from "../sessionReflection";
import type { Session } from "../../types";

function makeSession(messages: { role: string; content: string }[]): Session {
  return {
    id: "test-session",
    title: "Test",
    questions: [],
    threads: [
      {
        id: "t1",
        title: "Conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: messages.map((m, i) => ({
          id: `m${i}`,
          role: m.role as "user" | "assistant",
          content: m.content,
          ts: Date.now(),
        })),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: { modelUrl: "", modelId: "", localId: "" },
  };
}

describe("generateReflection", () => {
  it("returns empty string for sessions with no user messages", () => {
    const session = makeSession([
      { role: "assistant", content: "How can I help?" },
    ]);
    expect(generateReflection(session)).toBe("");
  });

  it("returns themes-only summary when no dominant emotion", () => {
    const session = makeSession([
      { role: "user", content: "I want to set goals and plan my future career and make progress" },
      { role: "assistant", content: "Tell me more." },
    ]);
    const reflection = generateReflection(session);
    expect(reflection).toContain("Reflected on");
    expect(reflection).toContain("goals");
  });

  it("combines emotion and theme correctly", () => {
    const session = makeSession([
      { role: "user", content: "I'm really anxious and worried about my relationship with my partner after our argument" },
    ]);
    const reflection = generateReflection(session);
    expect(reflection).toContain("Worked through");
    expect(reflection).toContain("feelings");
  });

  it("handles short messages with the fallback path", () => {
    const session = makeSession([
      { role: "user", content: "hello" },
    ]);
    const reflection = generateReflection(session);
    expect(reflection).toBe("hello");
  });

  // R16: the summary used to stutter ("grateful feelings around gratitude") and
  // pin the theme slot to gratitude, discarding the entry's actual subject.
  const r16Cases: { text: string; expected: string }[] = [
    {
      text: "I'm so grateful for the call with my sister today",
      expected: "Noticed grateful feelings around relationships.",
    },
    {
      text: "I really appreciate my partner",
      expected: "Noticed grateful feelings around relationships.",
    },
    {
      text: "counting my blessings after a hard week",
      expected: "Sat with grateful feelings.",
    },
    {
      text: "I'm grateful I finally made progress on my goal this week",
      expected: "Noticed grateful feelings around goals.",
    },
    {
      text: "I'm really anxious and worried about my relationship with my partner after our argument",
      expected: "Worked through anxious feelings around relationships.",
    },
    {
      text: "Today I noticed the bright side of a rough morning",
      expected: "Reflected on gratitude.",
    },
  ];

  it.each(r16Cases)("summarises $text", ({ text, expected }) => {
    const session = makeSession([{ role: "user", content: text }]);
    expect(generateReflection(session)).toBe(expected);
  });

  it("never names both grateful and gratitude in one summary", () => {
    for (const { text } of r16Cases) {
      const reflection = generateReflection(
        makeSession([{ role: "user", content: text }]),
      ).toLowerCase();
      expect(
        reflection.includes("grateful") && reflection.includes("gratitude"),
      ).toBe(false);
    }
  });

  it("truncates long fallback text with ellipsis", () => {
    const session = makeSession([
      { role: "user", content: "one two three four five six seven eight nine ten eleven twelve" },
    ]);
    const reflection = generateReflection(session);
    expect(reflection).toContain("…");
    expect(reflection.split(/\s+/).length).toBeLessThanOrEqual(11); // 10 words + ellipsis
  });
});

describe("shouldRegenerate", () => {
  it("returns true when reflection is missing", () => {
    const session = makeSession([{ role: "user", content: "test" }]);
    expect(shouldRegenerate(session)).toBe(true);
  });

  it("returns true when reflectionUpdatedAt is stale", () => {
    const session = makeSession([{ role: "user", content: "test" }]);
    (session as any).reflection = "old reflection";
    (session as any).reflectionUpdatedAt = session.updatedAt - 1000;
    expect(shouldRegenerate(session)).toBe(true);
  });

  it("returns false when reflection is current", () => {
    const session = makeSession([{ role: "user", content: "test" }]);
    (session as any).reflection = "current reflection";
    (session as any).reflectionUpdatedAt = session.updatedAt + 1;
    expect(shouldRegenerate(session)).toBe(false);
  });
});
