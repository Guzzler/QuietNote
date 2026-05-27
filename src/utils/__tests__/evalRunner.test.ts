import { describe, it, expect } from "vitest";
import { evaluateResponse, EVAL_CASES } from "../evalRunner";
import type { EvalCase } from "../evalRunner";

function makeCase(overrides: Partial<EvalCase>): EvalCase {
  return {
    id: "test",
    dimension: "empathy",
    prompt: "test prompt",
    expectedBehavior: "test",
    passCriteria: {},
    ...overrides,
  };
}

describe("evaluateResponse — maxSentences", () => {
  it("passes when sentence count is within limit", () => {
    const c = makeCase({ passCriteria: { maxSentences: 4 } });
    const result = evaluateResponse(
      "First sentence. Second sentence. Third sentence. Fourth sentence.",
      c
    );
    expect(result.passed).toBe(true);
  });

  it("fails when sentence count exceeds limit", () => {
    const c = makeCase({ passCriteria: { maxSentences: 4 } });
    const result = evaluateResponse(
      "One. Two. Three. Four. Five sentences here.",
      c
    );
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain("Too many sentences");
  });

  it("handles sentences ending with ! and ?", () => {
    const c = makeCase({ passCriteria: { maxSentences: 3 } });
    const result = evaluateResponse(
      "Wow! That's amazing? Really great. One more!",
      c
    );
    expect(result.passed).toBe(false);
  });
});

describe("evaluateResponse — mustEchoPriorTurn", () => {
  const priorTurns: EvalCase["priorTurns"] = [
    { role: "user", content: "My friend Sarah cancelled our plans again." },
    { role: "assistant", content: "That must be frustrating." },
  ];

  it("passes when response echoes a content word from prior turns", () => {
    const c = makeCase({
      priorTurns,
      passCriteria: { mustEchoPriorTurn: true },
    });
    const result = evaluateResponse(
      "It sounds like Sarah's cancelling has really hurt you.",
      c
    );
    expect(result.passed).toBe(true);
  });

  it("fails when response has no echo of prior turn words", () => {
    const c = makeCase({
      priorTurns,
      passCriteria: { mustEchoPriorTurn: true },
    });
    const result = evaluateResponse(
      "Tell me more about how you are doing today.",
      c
    );
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain("No echo of prior turn");
  });

  it("fails when response only echoes stopwords from prior turn", () => {
    const c = makeCase({
      priorTurns: [
        { role: "user", content: "They have been doing that with them." },
        { role: "assistant", content: "I see." },
      ],
      passCriteria: { mustEchoPriorTurn: true },
    });
    const result = evaluateResponse(
      "Tell me what is on your mind right now.",
      c
    );
    expect(result.passed).toBe(false);
  });

  it("is a no-op when priorTurns is empty", () => {
    const c = makeCase({
      priorTurns: [],
      passCriteria: { mustEchoPriorTurn: true },
    });
    const result = evaluateResponse("Generic response here.", c);
    expect(result.passed).toBe(true);
  });
});

describe("EVAL_CASES integrity", () => {
  it("has unique IDs", () => {
    const ids = EVAL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes multi-turn empathy cases", () => {
    const mt = EVAL_CASES.filter(
      (c) => c.priorTurns && c.priorTurns.length > 0
    );
    expect(mt.length).toBeGreaterThanOrEqual(4);
  });

  it("includes format sentence-count case", () => {
    const sentenceCases = EVAL_CASES.filter(
      (c) => c.passCriteria.maxSentences !== undefined
    );
    expect(sentenceCases.length).toBeGreaterThanOrEqual(1);
  });
});
