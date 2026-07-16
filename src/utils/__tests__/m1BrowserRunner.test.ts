import { describe, it, expect } from "vitest";

import {
  runM1Baseline,
  m1ResultToMarkdown,
  m1TotalSteps,
  type M1Progress,
} from "../m1BrowserRunner";
import { ECHO_EVAL_CASES } from "../echoEvalCases";
import { QUALITY_BAR_SCENARIOS } from "../qualityBarScenarios";
import { isBareDeflection } from "../responseShaping";

// Guards for the M1b in-browser runner (2026-07-16): it must run the SAME
// instrument as the headless `npm run eval:m1` path — every echo case, every
// scenario turn, deflection guard applied — and emit one committable report.

const CANNED_REPLY =
  "That sounds like it carried real weight for you. What part of it stays with you tonight?";

describe("runM1Baseline", () => {
  it("runs every echo case and every scenario turn against the supplied generate", async () => {
    let calls = 0;
    const result = await runM1Baseline({
      generate: async () => {
        calls += 1;
        return CANNED_REPLY;
      },
      modelLabel: "mock-model",
    });

    expect(calls).toBe(m1TotalSteps());
    expect(result.echoRows).toHaveLength(ECHO_EVAL_CASES.length);
    expect(result.scenarioResults).toHaveLength(QUALITY_BAR_SCENARIOS.length);
    expect(result.runs).toHaveLength(QUALITY_BAR_SCENARIOS.length);
    for (const run of result.runs) {
      expect(run.strategy).toBe("managed");
      expect(run.turns).toHaveLength(10);
    }
    // Echo metric actually applied: canned reply shares no 3-gram with entries.
    for (const row of result.echoRows) {
      expect(row.noEcho).toBe(2);
      expect(row.overlap).toBeLessThan(0.35);
    }
  });

  it("reprompts once when the first reply is a bare deflection (app-faithful send path)", async () => {
    // Crisis-resource keyword, no question, no pain acknowledgement.
    const deflection = "Please call 988 or a crisis line.";
    expect(isBareDeflection(deflection)).toBe(true);
    let calls = 0;
    const result = await runM1Baseline({
      generate: async () => {
        calls += 1;
        // Deflect on the very first call only; the guard must retry it.
        return calls === 1 ? deflection : CANNED_REPLY;
      },
      modelLabel: "mock-model",
    });
    expect(calls).toBe(m1TotalSteps() + 1);
    expect(result.echoRows[0].opening).not.toBe(deflection);
  });

  it("reports monotonic progress with the m1TotalSteps denominator", async () => {
    const seen: M1Progress[] = [];
    await runM1Baseline({
      generate: async () => CANNED_REPLY,
      modelLabel: "mock-model",
      onProgress: (p) => seen.push(p),
    });
    expect(seen.length).toBe(m1TotalSteps());
    expect(seen.every((p) => p.total === m1TotalSteps())).toBe(true);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i].done).toBeGreaterThanOrEqual(seen[i - 1].done);
    }
    expect(seen.at(-1)!.done).toBe(m1TotalSteps() - 1);
  });

  it("stops when the signal aborts", async () => {
    const controller = new AbortController();
    let calls = 0;
    await expect(
      runM1Baseline({
        generate: async () => {
          calls += 1;
          if (calls === 2) controller.abort();
          return CANNED_REPLY;
        },
        modelLabel: "mock-model",
        signal: controller.signal,
      })
    ).rejects.toThrow("aborted");
    expect(calls).toBeLessThan(m1TotalSteps());
  });
});

describe("m1ResultToMarkdown", () => {
  it("contains the echo table, rubric summary, and a full transcript per scenario", async () => {
    const result = await runM1Baseline({
      generate: async () => CANNED_REPLY,
      modelLabel: "mock-model",
    });
    const md = m1ResultToMarkdown(result);

    expect(md).toContain("M1 Baseline (in-browser) — mock-model");
    expect(md).toContain("## Echo cases (single-turn)");
    for (const c of ECHO_EVAL_CASES) expect(md).toContain(`| ${c.id} |`);
    expect(md).toContain("Quality-Bar Rubric Report");
    for (const s of QUALITY_BAR_SCENARIOS) {
      expect(md).toContain(`## Transcript: ${s.script.id}`);
      // Every user turn appears verbatim in the transcript.
      for (const t of s.script.turns) expect(md).toContain(t.user);
    }
    expect(md).toContain(CANNED_REPLY);
  });
});
