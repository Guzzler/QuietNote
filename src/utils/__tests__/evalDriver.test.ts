import { describe, it, expect, vi } from "vitest";
import { runEvalSuite, reportToMarkdown, rescoreStoredReplies } from "../evalDriver";
import { EVAL_CASES } from "../evalRunner";

type GenerateFn = (messages: { role: string; content: string }[]) => Promise<string>;

function mockGenerate(response: string) {
  return vi.fn<GenerateFn>(async () => response);
}

const SYSTEM = "You are a journaling companion.";

describe("runEvalSuite", () => {
  it("calls generate once per eligible case", async () => {
    const generate = mockGenerate("I'm here to help you reflect on your journal.");
    await runEvalSuite({ systemInstruction: SYSTEM, generate });
    expect(generate).toHaveBeenCalledTimes(EVAL_CASES.length);
  });

  it("passes system instruction and user prompt to generate", async () => {
    const generate = mockGenerate("Let's journal together.");
    await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      dimensions: ["persona"],
    });

    const personaCases = EVAL_CASES.filter((c) => c.dimension === "persona");
    expect(generate).toHaveBeenCalledTimes(personaCases.length);

    const firstCall = generate.mock.calls[0]!;
    expect(firstCall[0][0]).toEqual({ role: "system", content: SYSTEM });
    expect(firstCall[0][1]!.role).toBe("user");
  });

  it("dimension filter limits which cases run", async () => {
    const generate = mockGenerate("Please talk to your doctor.");
    const report = await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      dimensions: ["medical_refusal"],
    });

    const medicalCases = EVAL_CASES.filter((c) => c.dimension === "medical_refusal");
    expect(report.results.length).toBe(medicalCases.length);
    expect(generate).toHaveBeenCalledTimes(medicalCases.length);
  });

  it("stops on abort signal but returns partial report", async () => {
    const controller = new AbortController();
    let callCount = 0;
    const generate = vi.fn(async () => {
      callCount++;
      if (callCount >= 3) controller.abort();
      return "journaling reflection";
    });

    const report = await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      signal: controller.signal,
    });

    expect(report.results.length).toBeLessThan(EVAL_CASES.length);
    expect(report.results.length).toBeGreaterThanOrEqual(3);
  });

  it("records inference error and continues on generate rejection", async () => {
    let callCount = 0;
    const generate = vi.fn(async () => {
      callCount++;
      if (callCount === 2) throw new Error("OOM");
      return "Let me help you reflect on your journal and feelings.";
    });

    const report = await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      dimensions: ["persona"],
    });

    const personaCases = EVAL_CASES.filter((c) => c.dimension === "persona");
    expect(report.results.length).toBe(personaCases.length);

    const errorResult = report.results[1];
    expect(errorResult.passed).toBe(false);
    expect(errorResult.failures[0]).toContain("inference error");
    expect(errorResult.response).toBe("");
  });

  it("fires progress callback in order", async () => {
    const progressCalls: number[] = [];
    const generate = mockGenerate("journal reflect feeling");

    await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      dimensions: ["format"],
      onProgress: (done) => progressCalls.push(done),
    });

    const formatCases = EVAL_CASES.filter((c) => c.dimension === "format");
    expect(progressCalls).toEqual(formatCases.map((_, i) => i + 1));
  });

  it("report summary matches actual results", async () => {
    const generate = mockGenerate("I suggest consulting a professional healthcare doctor about your feelings.");
    const report = await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      dimensions: ["medical_refusal"],
    });

    const actualPassed = report.results.filter((r) => r.passed).length;
    const actualFailed = report.results.filter((r) => !r.passed).length;
    expect(report.summary.passed).toBe(actualPassed);
    expect(report.summary.failed).toBe(actualFailed);
    expect(report.summary.total).toBe(report.results.length);
  });
});

describe("priorTurns handling", () => {
  it("passes priorTurns between system and user prompt", async () => {
    const generate = vi.fn<GenerateFn>(async () => "Sarah must be important to you.");
    await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      dimensions: ["empathy"],
    });

    const multiTurnCalls = generate.mock.calls.filter(
      (call) => call[0].length > 2
    );
    expect(multiTurnCalls.length).toBeGreaterThan(0);

    for (const call of multiTurnCalls) {
      const msgs = call[0];
      expect(msgs[0].role).toBe("system");
      expect(msgs[msgs.length - 1].role).toBe("user");
      for (let i = 1; i < msgs.length - 1; i++) {
        expect(["user", "assistant"]).toContain(msgs[i].role);
      }
    }
  });

  it("handles cases with no priorTurns as before", async () => {
    const generate = mockGenerate("journal reflect feeling");
    await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      dimensions: ["persona"],
    });

    for (const call of generate.mock.calls) {
      expect(call[0]).toHaveLength(2);
      expect(call[0][0].role).toBe("system");
      expect(call[0][1].role).toBe("user");
    }
  });
});

describe("reportToMarkdown", () => {
  it("produces non-empty markdown with expected sections", async () => {
    const generate = mockGenerate("journal reflect feeling");
    const report = await runEvalSuite({
      systemInstruction: SYSTEM,
      generate,
      dimensions: ["format"],
    });

    const md = reportToMarkdown(report);
    expect(md).toContain("# Eval Report");
    expect(md).toContain("## Results by Dimension");
    expect(md).toContain("## Weakest Dimensions");
    expect(md.length).toBeGreaterThan(100);
  });

  it("always includes passing empathy-mt-* bodies even past position 5", () => {
    // Synthetic report where a passing empathy-mt-3 sits at position 8 in
    // the passing list — the previous renderer (passing.slice(0,5)) would
    // have dropped it. The renderer must always surface multi-turn passes.
    const passingFillers = Array.from({ length: 8 }).map((_, i) => ({
      caseId: `filler-${i}`,
      dimension: "persona" as const,
      passed: true,
      failures: [],
      response: `filler body ${i}`,
    }));
    const mtPass = {
      caseId: "empathy-mt-3",
      dimension: "empathy" as const,
      passed: true,
      failures: [],
      response: "I remember you mentioned the family dinner and what your mom said.",
    };
    const report = {
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      modelLabel: "test",
      systemInstruction: SYSTEM,
      results: [...passingFillers, mtPass],
      summary: {
        total: 9,
        passed: 9,
        failed: 0,
        byDimension: {
          persona: { passed: 8, failed: 0, total: 8 },
          empathy: { passed: 1, failed: 0, total: 1 },
        },
        medicalRefusalDirect: { passed: 0, failed: 0, total: 0 },
        medicalRefusalIndirect: { passed: 0, failed: 0, total: 0 },
      },
    };

    const md = reportToMarkdown(report);
    expect(md).toContain("empathy-mt-3");
    expect(md).toContain("family dinner");
  });
});

// M9 (2026-07-29): a run artifact must state its own seed, and only when it
// really had one — an unseeded report gaining a `seed: null` key would change
// every historical artifact's shape.
describe("seed recording (M9)", () => {
  it("carries a pinned seed into the report and the markdown header", async () => {
    const report = await runEvalSuite({
      systemInstruction: SYSTEM,
      generate: mockGenerate("Please talk to your doctor."),
      dimensions: ["persona"],
      seed: 33,
    });
    expect(report.seed).toBe(33);
    expect(reportToMarkdown(report)).toContain("- **Seed**: 33");
  });

  it("omits the seed key entirely when the run was unseeded", async () => {
    const report = await runEvalSuite({
      systemInstruction: SYSTEM,
      generate: mockGenerate("Please talk to your doctor."),
      dimensions: ["persona"],
    });
    expect("seed" in report).toBe(false);
    expect(reportToMarkdown(report)).not.toContain("**Seed**");
  });
});

// M9 (2026-07-29): offline re-score. The contract that matters is that
// re-scoring a run's own stored replies reproduces that run's tallies exactly
// — otherwise `--rescore` would be a second instrument rather than the same
// one applied to preserved text.
describe("rescoreStoredReplies (M9)", () => {
  it("reproduces the original run's tallies exactly from its stored replies", async () => {
    // Vary the reply by case so the run has a real pass/fail mix.
    let n = 0;
    const generate = vi.fn<GenerateFn>(async () => {
      n++;
      return n % 3 === 0
        ? "Please talk to your doctor about that. What feels heaviest right now?"
        : "That sounds heavy. What part of it is sitting with you most?";
    });
    const original = await runEvalSuite({ systemInstruction: SYSTEM, generate });

    const stored = Object.fromEntries(original.results.map((r) => [r.caseId, r.response]));
    const rescored = rescoreStoredReplies(stored, [...EVAL_CASES], {
      modelLabel: "fixture",
      systemInstruction: SYSTEM,
    });

    expect(rescored.summary).toEqual(original.summary);
    expect(rescored.results.map((r) => [r.caseId, r.passed])).toEqual(
      original.results.map((r) => [r.caseId, r.passed])
    );
  });

  it("hard-errors on a stored case id the current EVAL_CASES no longer has", () => {
    expect(() =>
      rescoreStoredReplies({ "case-that-was-deleted": "a reply" }, [...EVAL_CASES], {
        modelLabel: "fixture",
        systemInstruction: SYSTEM,
      })
    ).toThrow(/not in the current EVAL_CASES/);
  });

  it("records the seed only when the stored run had one", () => {
    const id = EVAL_CASES[0].id;
    const withSeed = rescoreStoredReplies({ [id]: "hello" }, [...EVAL_CASES], {
      modelLabel: "fixture",
      systemInstruction: SYSTEM,
      seed: 22,
    });
    expect(withSeed.seed).toBe(22);
    const without = rescoreStoredReplies({ [id]: "hello" }, [...EVAL_CASES], {
      modelLabel: "fixture",
      systemInstruction: SYSTEM,
    });
    expect("seed" in without).toBe(false);
  });
});
