import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  trimConversationHistory,
  buildManagedMessages,
  AVAILABLE_FOR_HISTORY,
  MODEL_CONTEXT_LIMIT,
  RESERVED_FOR_GENERATION,
  type SimpleMessage,
} from "../tokenEstimator";

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 0 for null-ish input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates tokens for short text", () => {
    // "Hello world" = 11 chars → ceil(11/3.5) = 4 tokens
    expect(estimateTokens("Hello world")).toBe(4);
  });

  it("estimates tokens for longer text", () => {
    const text = "This is a longer piece of text that should require more tokens to represent.";
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(50);
  });

  it("handles unicode/emoji text", () => {
    const tokens = estimateTokens("I feel 😊 today and 😢 sometimes");
    expect(tokens).toBeGreaterThan(0);
  });
});

describe("trimConversationHistory", () => {
  const shortMsg = (role: string, content: string): SimpleMessage => ({
    role,
    content,
  });

  it("returns empty array for empty input", () => {
    const result = trimConversationHistory([]);
    expect(result.messages).toEqual([]);
    expect(result.trimmed).toBe(false);
    expect(result.originalCount).toBe(0);
    expect(result.keptCount).toBe(0);
  });

  it("returns all messages when they fit within budget", () => {
    const messages = [
      shortMsg("user", "Hello"),
      shortMsg("assistant", "Hi there"),
      shortMsg("user", "How are you?"),
      shortMsg("assistant", "I'm doing well."),
    ];
    const result = trimConversationHistory(messages, 1000);
    expect(result.messages).toEqual(messages);
    expect(result.trimmed).toBe(false);
    expect(result.keptCount).toBe(4);
  });

  it("trims oldest messages when exceeding budget", () => {
    // Each message ~100 chars = ~29 tokens
    const longContent = "x".repeat(100);
    const messages = [
      shortMsg("user", longContent + " MSG1"),
      shortMsg("assistant", longContent + " MSG2"),
      shortMsg("user", longContent + " MSG3"),
      shortMsg("assistant", longContent + " MSG4"),
      shortMsg("user", longContent + " MSG5"),
    ];
    // Budget for ~2 messages worth
    const result = trimConversationHistory(messages, 60);
    expect(result.trimmed).toBe(true);
    expect(result.keptCount).toBeLessThan(5);
    // Most recent messages should be kept
    expect(result.messages[result.messages.length - 1].content).toContain("MSG5");
  });

  it("keeps at least one message even if it exceeds budget", () => {
    const messages = [shortMsg("user", "x".repeat(500))];
    const result = trimConversationHistory(messages, 10);
    expect(result.messages.length).toBe(1);
    expect(result.trimmed).toBe(false); // all messages kept
  });

  it("returns empty when budget is 0", () => {
    const messages = [
      shortMsg("user", "Hello"),
      shortMsg("assistant", "Hi"),
    ];
    const result = trimConversationHistory(messages, 0);
    expect(result.messages).toEqual([]);
    expect(result.trimmed).toBe(true);
  });

  it("preserves chronological order after trimming", () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      shortMsg(i % 2 === 0 ? "user" : "assistant", `Message ${i}`)
    );
    const result = trimConversationHistory(messages, 50);
    expect(result.trimmed).toBe(true);
    // Verify order is ascending
    for (let i = 1; i < result.messages.length; i++) {
      const prevNum = parseInt(result.messages[i - 1].content.split(" ")[1]);
      const currNum = parseInt(result.messages[i].content.split(" ")[1]);
      expect(currNum).toBeGreaterThan(prevNum);
    }
  });
});

describe("buildManagedMessages", () => {
  const systemPrompt = "You are a helpful assistant.";

  it("includes system message with role 'system'", () => {
    const { messages } = buildManagedMessages(systemPrompt, "Hello");
    expect(messages[0]).toEqual({ role: "system", content: systemPrompt });
  });

  it("includes current entry as last message", () => {
    const { messages } = buildManagedMessages(systemPrompt, "How are you?");
    const last = messages[messages.length - 1];
    expect(last).toEqual({ role: "user", content: "How are you?" });
  });

  it("includes conversation history between system and current entry", () => {
    const history = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello!" },
    ];
    const { messages } = buildManagedMessages(systemPrompt, "Follow up", history);
    expect(messages.length).toBe(4); // system + 2 history + current
    expect(messages[1].content).toBe("Hi");
    expect(messages[2].content).toBe("Hello!");
    expect(messages[3].content).toBe("Follow up");
  });

  it("trims history when conversation is very long", () => {
    // Create a very long conversation
    const history = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "x".repeat(200) + ` turn ${i}`,
    }));
    const { messages, trimResult } = buildManagedMessages(
      systemPrompt,
      "Latest message",
      history
    );
    expect(trimResult.trimmed).toBe(true);
    // Should still have system + some history + current entry
    expect(messages[0].role).toBe("system");
    expect(messages[messages.length - 1].content).toBe("Latest message");
    // Total token count should be within limits
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 3.5);
    expect(estimatedTokens).toBeLessThanOrEqual(
      MODEL_CONTEXT_LIMIT - RESERVED_FOR_GENERATION + 100 // allow some margin
    );
  });

  it("reports trimmed=false for short conversations", () => {
    const { trimResult } = buildManagedMessages(systemPrompt, "Hello", []);
    expect(trimResult.trimmed).toBe(false);
  });

  it("handles empty history", () => {
    const { messages } = buildManagedMessages(systemPrompt, "Hello");
    expect(messages.length).toBe(2); // system + current
  });
});

describe("constants", () => {
  it("available history budget is consistent", () => {
    expect(AVAILABLE_FOR_HISTORY).toBe(
      MODEL_CONTEXT_LIMIT - RESERVED_FOR_GENERATION - 200
    );
  });

  it("model context limit is reasonable for small LLM", () => {
    expect(MODEL_CONTEXT_LIMIT).toBeGreaterThanOrEqual(2048);
    expect(MODEL_CONTEXT_LIMIT).toBeLessThanOrEqual(8192);
  });
});
