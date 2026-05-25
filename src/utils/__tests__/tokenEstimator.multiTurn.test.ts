import { describe, it, expect } from "vitest";
import { buildManagedMessages } from "../tokenEstimator";

describe("buildManagedMessages — multi-turn journaling scenarios", () => {
  it("retains a full 5-step Thought Record exchange", () => {
    const systemPrompt = "x".repeat(2000);
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Turn ${i + 1}: ${"reflective sentence ".repeat(7)}`,
    }));
    const currentEntry = "And the alternative thought I want to hold is...";

    const { messages, trimResult } = buildManagedMessages(systemPrompt, currentEntry, history);

    expect(trimResult.trimmed).toBe(false);
    expect(trimResult.keptCount).toBe(10);
    expect(messages).toHaveLength(12);
  });

  it("still trims gracefully when conversation truly exceeds budget", () => {
    const systemPrompt = "x".repeat(2000);
    const history = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "y".repeat(800),
    }));
    const { trimResult } = buildManagedMessages(systemPrompt, "next", history);
    expect(trimResult.trimmed).toBe(true);
    expect(trimResult.keptCount).toBeGreaterThanOrEqual(1);
    expect(trimResult.keptCount).toBeLessThan(40);
  });
});
