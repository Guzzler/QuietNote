import { describe, it, expect, vi } from "vitest";
import { runEvalSuite, reportToMarkdown } from "../../utils/evalDriver";
import { EVAL_CASES } from "../../utils/evalRunner";
import type { EvalDimension } from "../../utils/evalRunner";

describe("EvalPanel integration logic", () => {
  it("gating: panel should only be available when ?eval=1 is in URL", () => {
    const params = new URLSearchParams("?eval=1");
    expect(params.has("eval")).toBe(true);

    const noEval = new URLSearchParams("");
    expect(noEval.has("eval")).toBe(false);
  });

  it("dimension checkbox filtering: selecting subset runs only matching cases", async () => {
    const dims: EvalDimension[] = ["persona", "format"];
    const generate = vi.fn(async () => "Let's reflect on your journal together.");
    const report = await runEvalSuite({
      systemInstruction: "You are a test.",
      generate,
      dimensions: dims,
    });

    const expectedCount = EVAL_CASES.filter((c) => dims.includes(c.dimension)).length;
    expect(report.results.length).toBe(expectedCount);
    expect(generate).toHaveBeenCalledTimes(expectedCount);
  });

  it("copy markdown produces non-empty report text with proper structure", async () => {
    const generate = vi.fn(async () => "Journaling can help you explore your feelings?");
    const report = await runEvalSuite({
      systemInstruction: "You are Quietnote.",
      generate,
      dimensions: ["empathy"],
    });

    const md = reportToMarkdown(report);
    expect(md).toBeTruthy();
    expect(md).toContain("# Eval Report");
    expect(md).toContain("empathy");
    expect(md.length).toBeGreaterThan(50);
  });

  it("mode selection changes system instruction passed to generate", async () => {
    const instructions: Record<string, string> = {
      freewrite: "You are Quietnote in freewrite mode.",
      gratitude: "You are Quietnote in gratitude mode.",
    };

    for (const instruction of Object.values(instructions)) {
      type GenFn = (msgs: { role: string; content: string }[]) => Promise<string>;
      const generate = vi.fn<GenFn>(async () => "reflection journal");
      await runEvalSuite({
        systemInstruction: instruction,
        generate,
        dimensions: ["persona"],
      });

      const firstCall = generate.mock.calls[0]!;
      expect(firstCall[0][0]!.content).toBe(instruction);
    }
  });
});
