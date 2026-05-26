import { describe, it, expect, vi } from "vitest";
import { runEvalSuite, reportToMarkdown } from "../evalDriver";
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
});
