import { describe, it, expect } from "vitest";

import {
  parseToolCalls,
  validateToolCall,
  TOOL_NAMES,
  VALID_PROMPT_CATEGORIES,
  VALID_MOOD_EMOTIONS,
  TOOL_GRAMMAR_INSTRUCTION,
  TOOL_REPROMPT_INSTRUCTION,
} from "../toolCalls";

describe("parseToolCalls", () => {
  it("extracts a well-formed suggest_prompt call", () => {
    const cat = VALID_PROMPT_CATEGORIES[0];
    const res = parseToolCalls(`<<tool:suggest_prompt category=${cat}>>`);
    expect(res.calls).toHaveLength(1);
    expect(res.calls[0].name).toBe("suggest_prompt");
    expect(res.calls[0].args).toEqual({ category: cat });
    expect(res.validCalls).toHaveLength(1);
    expect(res.invalidCalls).toHaveLength(0);
  });

  it("parses a quoted free-text query for search_past_entries", () => {
    const res = parseToolCalls(`<<tool:search_past_entries query="my sister">>`);
    expect(res.validCalls).toHaveLength(1);
    expect(res.validCalls[0].args).toEqual({ query: "my sister" });
  });

  it("parses multiple args for log_mood", () => {
    const res = parseToolCalls(`<<tool:log_mood emotion=anxious intensity=7>>`);
    expect(res.validCalls).toHaveLength(1);
    expect(res.validCalls[0].args).toEqual({ emotion: "anxious", intensity: "7" });
  });

  it("extracts multiple calls across lines", () => {
    const res = parseToolCalls(
      [
        "Sure, here you go.",
        `<<tool:suggest_prompt category=${VALID_PROMPT_CATEGORIES[0]}>>`,
        "And also:",
        `<<tool:search_past_entries query="job interview">>`,
      ].join("\n")
    );
    expect(res.calls).toHaveLength(2);
    expect(res.calls.map((c) => c.name)).toEqual([
      "suggest_prompt",
      "search_past_entries",
    ]);
  });

  it("ignores prose with no tool calls", () => {
    const res = parseToolCalls("That sounds really hard. What part feels heaviest right now?");
    expect(res.calls).toHaveLength(0);
    expect(res.strippedText).toContain("That sounds really hard");
  });

  it("strippedText removes every tool-call line and leaves display prose intact", () => {
    const res = parseToolCalls(
      [
        "I hear you — let's find a starting point.",
        `<<tool:suggest_prompt category=${VALID_PROMPT_CATEGORIES[0]}>>`,
        "Take your time with it.",
      ].join("\n")
    );
    expect(res.strippedText).not.toContain("<<tool:");
    expect(res.strippedText).toContain("I hear you");
    expect(res.strippedText).toContain("Take your time");
  });

  it("does not leak syntax even when the call is the only content", () => {
    const res = parseToolCalls(`<<tool:log_mood emotion=sad intensity=9>>`);
    expect(res.strippedText).toBe("");
  });
});

describe("validateToolCall", () => {
  it("accepts each of the 3 tools with valid args", () => {
    expect(
      validateToolCall({
        name: "suggest_prompt",
        args: { category: VALID_PROMPT_CATEGORIES[0] },
        raw: "",
      }).valid
    ).toBe(true);
    expect(
      validateToolCall({
        name: "search_past_entries",
        args: { query: "sister" },
        raw: "",
      }).valid
    ).toBe(true);
    expect(
      validateToolCall({
        name: "log_mood",
        args: { emotion: VALID_MOOD_EMOTIONS[0], intensity: "5" },
        raw: "",
      }).valid
    ).toBe(true);
  });

  it("rejects an unknown tool name", () => {
    const r = validateToolCall({ name: "delete_everything", args: {}, raw: "" });
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/unknown tool/);
  });

  it("rejects an unknown arg", () => {
    const r = validateToolCall({
      name: "suggest_prompt",
      args: { category: VALID_PROMPT_CATEGORIES[0], extra: "x" },
      raw: "",
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/unknown arg/);
  });

  it("rejects an out-of-domain category", () => {
    const r = validateToolCall({
      name: "suggest_prompt",
      args: { category: "not-a-real-category" },
      raw: "",
    });
    expect(r.valid).toBe(false);
  });

  it("rejects an out-of-range intensity", () => {
    expect(
      validateToolCall({
        name: "log_mood",
        args: { emotion: "sad", intensity: "11" },
        raw: "",
      }).valid
    ).toBe(false);
    expect(
      validateToolCall({
        name: "log_mood",
        args: { emotion: "sad", intensity: "0" },
        raw: "",
      }).valid
    ).toBe(false);
    expect(
      validateToolCall({
        name: "log_mood",
        args: { emotion: "sad", intensity: "5.5" },
        raw: "",
      }).valid
    ).toBe(false);
  });

  it("rejects an unknown emotion", () => {
    expect(
      validateToolCall({
        name: "log_mood",
        args: { emotion: "ecstatic", intensity: "5" },
        raw: "",
      }).valid
    ).toBe(false);
  });

  it("rejects a missing required arg", () => {
    expect(
      validateToolCall({ name: "suggest_prompt", args: {}, raw: "" }).valid
    ).toBe(false);
    expect(
      validateToolCall({ name: "log_mood", args: { emotion: "sad" }, raw: "" }).valid
    ).toBe(false);
  });

  it("rejects an empty query", () => {
    expect(
      validateToolCall({ name: "search_past_entries", args: { query: "   " }, raw: "" }).valid
    ).toBe(false);
  });
});

describe("malformed shapes are not parsed as valid calls", () => {
  it("does not parse <<tool:>> (no name)", () => {
    const res = parseToolCalls("<<tool:>>");
    // no valid name → not matched as a call at all
    expect(res.validCalls).toHaveLength(0);
  });

  it("does not parse an unterminated <<tool:foo", () => {
    const res = parseToolCalls("<<tool:foo category=gratitude");
    expect(res.calls).toHaveLength(0);
    expect(res.validCalls).toHaveLength(0);
  });

  it("does not parse free JSON as a tool call", () => {
    const res = parseToolCalls(`{"tool":"suggest_prompt","category":"gratitude"}`);
    expect(res.calls).toHaveLength(0);
    expect(res.validCalls).toHaveLength(0);
  });

  it("buckets a well-formed call with a bad name as invalid (retry candidate)", () => {
    const res = parseToolCalls("<<tool:make_coffee size=large>>");
    expect(res.calls).toHaveLength(1);
    expect(res.validCalls).toHaveLength(0);
    expect(res.invalidCalls).toHaveLength(1);
  });

  it("does not match a call with trailing prose on the same line", () => {
    const res = parseToolCalls(
      `<<tool:suggest_prompt category=${VALID_PROMPT_CATEGORIES[0]}>> here you go`
    );
    expect(res.calls).toHaveLength(0);
  });
});

describe("grammar + reprompt instruction constants", () => {
  it("the grammar beat names every tool and the no-call clause", () => {
    for (const name of TOOL_NAMES) {
      expect(TOOL_GRAMMAR_INSTRUCTION).toContain(name);
    }
    expect(TOOL_GRAMMAR_INSTRUCTION.toLowerCase()).toContain("no tool");
  });

  it("the reprompt instruction is a single corrective nudge", () => {
    expect(TOOL_REPROMPT_INSTRUCTION.toLowerCase()).toContain("malformed");
    expect(TOOL_REPROMPT_INSTRUCTION).toContain("<<tool:");
  });
});
