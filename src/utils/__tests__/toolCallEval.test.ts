import { describe, it, expect } from "vitest";

import { TOOL_EVAL_CASES, scoreToolCase } from "../toolCallEval";
import {
  parseToolCalls,
  TOOL_NAMES,
  VALID_PROMPT_CATEGORIES,
  VALID_MOOD_EMOTIONS,
} from "../toolCalls";

const VALID_MODES = ["freewrite", "gratitude", "checkin", "thoughtrecord"];

describe("TOOL_EVAL_CASES shape", () => {
  it("has exactly 20 cases", () => {
    expect(TOOL_EVAL_CASES).toHaveLength(20);
  });

  it("has unique ids", () => {
    const ids = TOOL_EVAL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only valid journaling modes", () => {
    for (const c of TOOL_EVAL_CASES) {
      expect(VALID_MODES).toContain(c.mode);
    }
  });

  it("splits 8 expectCall / 12 ordinary", () => {
    expect(TOOL_EVAL_CASES.filter((c) => c.expectCall)).toHaveLength(8);
    expect(TOOL_EVAL_CASES.filter((c) => !c.expectCall)).toHaveLength(12);
  });

  it("every expectedTool is in the allow-list", () => {
    for (const c of TOOL_EVAL_CASES.filter((c) => c.expectCall)) {
      expect(c.expectedTool).toBeDefined();
      expect(TOOL_NAMES).toContain(c.expectedTool);
    }
  });

  it("every expectedArgs value is in-domain for its tool", () => {
    for (const c of TOOL_EVAL_CASES.filter((c) => c.expectCall && c.expectedArgs)) {
      const args = c.expectedArgs!;
      if (c.expectedTool === "suggest_prompt") {
        expect(VALID_PROMPT_CATEGORIES).toContain(args.category);
      } else if (c.expectedTool === "log_mood") {
        expect(VALID_MOOD_EMOTIONS as readonly string[]).toContain(args.emotion);
        const n = Number(args.intensity);
        expect(Number.isInteger(n) && n >= 1 && n <= 10).toBe(true);
      } else if (c.expectedTool === "search_past_entries") {
        expect(args.query.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("includes the 2 near-miss ordinary cases", () => {
    const ids = TOOL_EVAL_CASES.map((c) => c.id);
    expect(ids).toContain("ordinary-nearmiss-mood");
    expect(ids).toContain("ordinary-nearmiss-past");
  });

  it("spreads warranted cases across all three tools", () => {
    const tools = TOOL_EVAL_CASES.filter((c) => c.expectCall).map((c) => c.expectedTool);
    expect(tools.filter((t) => t === "suggest_prompt")).toHaveLength(3);
    expect(tools.filter((t) => t === "search_past_entries")).toHaveLength(3);
    expect(tools.filter((t) => t === "log_mood")).toHaveLength(2);
  });
});

describe("scoreToolCase", () => {
  const suggestCase = TOOL_EVAL_CASES.find((c) => c.id === "warrant-suggest-1")!;
  const moodCase = TOOL_EVAL_CASES.find((c) => c.id === "warrant-mood-1")!;
  const ordinaryCase = TOOL_EVAL_CASES.find((c) => c.id === "ordinary-reflect-1")!;

  it("scores a valid expected call as validCallMade with accurate args", () => {
    const parse = parseToolCalls(
      `<<tool:suggest_prompt category=${suggestCase.expectedArgs!.category}>>`
    );
    const score = scoreToolCase(suggestCase, parse);
    expect(score.validCallMade).toBe(true);
    expect(score.argAccurate).toBe(true);
    expect(score.falseCall).toBe(false);
  });

  it("marks args inaccurate when the wrong arg is emitted", () => {
    const wrongCat = VALID_PROMPT_CATEGORIES.find(
      (c) => c !== suggestCase.expectedArgs!.category
    )!;
    const parse = parseToolCalls(`<<tool:suggest_prompt category=${wrongCat}>>`);
    const score = scoreToolCase(suggestCase, parse);
    expect(score.validCallMade).toBe(true);
    expect(score.argAccurate).toBe(false);
  });

  it("fuzzy-matches a paraphrased free-text query", () => {
    const searchCase = TOOL_EVAL_CASES.find((c) => c.id === "warrant-search-1")!;
    const parse = parseToolCalls(`<<tool:search_past_entries query="my sister">>`);
    const score = scoreToolCase(searchCase, parse);
    expect(score.validCallMade).toBe(true);
    expect(score.argAccurate).toBe(true);
  });

  it("scores log_mood args exactly", () => {
    const parse = parseToolCalls(`<<tool:log_mood emotion=anxious intensity=7>>`);
    const score = scoreToolCase(moodCase, parse);
    expect(score.validCallMade).toBe(true);
    expect(score.argAccurate).toBe(true);
  });

  it("validCallMade is false when no call is emitted on a warranted case", () => {
    const parse = parseToolCalls("Sure — what's been on your mind lately?");
    const score = scoreToolCase(suggestCase, parse);
    expect(score.validCallMade).toBe(false);
    expect(score.argAccurate).toBeNull();
  });

  it("validCallMade is false when only an invalid call is emitted", () => {
    const parse = parseToolCalls("<<tool:suggest_prompt category=not-real>>");
    const score = scoreToolCase(suggestCase, parse);
    expect(score.validCallMade).toBe(false);
  });

  it("flags a false call when any tool is emitted on an ordinary case", () => {
    const parse = parseToolCalls("<<tool:log_mood emotion=happy intensity=5>>");
    const score = scoreToolCase(ordinaryCase, parse);
    expect(score.falseCall).toBe(true);
  });

  it("flags a false call even for a malformed/invalid call on an ordinary case", () => {
    const parse = parseToolCalls("<<tool:log_mood emotion=happy>>");
    const score = scoreToolCase(ordinaryCase, parse);
    expect(score.falseCall).toBe(true);
  });

  it("no false call when the model stays silent on an ordinary case", () => {
    const parse = parseToolCalls("That sounds like a meaningful day. What stood out most?");
    const score = scoreToolCase(ordinaryCase, parse);
    expect(score.falseCall).toBe(false);
  });
});
