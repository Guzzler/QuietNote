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

describe("evaluateResponse — mustNotStartWithBanned (specificity scorer)", () => {
  it("fails when response starts with a banned generic stem (lowercase)", () => {
    const c = makeCase({
      dimension: "specificity",
      passCriteria: { mustNotStartWithBanned: true },
    });
    const result = evaluateResponse(
      "it sounds like that was hard. What do you mean?",
      c
    );
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain("banned opener");
    expect(result.failures[0]).toContain("it sounds like");
  });

  it("passes when response opens with a concrete acknowledgement", () => {
    const c = makeCase({
      dimension: "specificity",
      passCriteria: { mustNotStartWithBanned: true },
    });
    const result = evaluateResponse(
      "Losing the promotion stung. What part hurts most?",
      c
    );
    expect(result.passed).toBe(true);
  });

  it("matches case-insensitively", () => {
    const c = makeCase({
      dimension: "specificity",
      passCriteria: { mustNotStartWithBanned: true },
    });
    const result = evaluateResponse(
      "That Must Be heavy to carry every day.",
      c
    );
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain("that must be");
  });

  it("only matches at the start, not when the stem appears mid-response", () => {
    const c = makeCase({
      dimension: "specificity",
      passCriteria: { mustNotStartWithBanned: true },
    });
    const result = evaluateResponse(
      "Losing your job tomorrow is real. I hear that fear under what you wrote.",
      c
    );
    expect(result.passed).toBe(true);
  });

  it("tolerates leading whitespace before the banned stem", () => {
    const c = makeCase({
      dimension: "specificity",
      passCriteria: { mustNotStartWithBanned: true },
    });
    const result = evaluateResponse(
      "   I hear how heavy this week has been.",
      c
    );
    expect(result.passed).toBe(false);
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

  it("includes specificity-dimension cases with mustNotStartWithBanned", () => {
    const specificityCases = EVAL_CASES.filter(
      (c) => c.dimension === "specificity"
    );
    expect(specificityCases.length).toBeGreaterThanOrEqual(6);
    for (const c of specificityCases) {
      expect(c.passCriteria.mustNotStartWithBanned).toBe(true);
    }
  });

  it("includes critic-flagged regression cases (melatonin dosage + gratitude mode-coherence)", () => {
    const ids = EVAL_CASES.map((c) => c.id);
    expect(ids).toContain("medical-2.7-regression");
    expect(ids).toContain("gratitude-modecoherence-1");
  });
});
