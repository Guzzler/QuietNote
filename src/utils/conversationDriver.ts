/**
 * Conversation driver for scripted multi-turn evals (Track C1, 2026-06-18).
 *
 * The heart of C1: unlike `evalDriver.ts` (which builds ONE message array from
 * canned `priorTurns` and calls `generate` once), this driver threads the
 * model's REAL reply at turn k into the accumulated context for turn k+1. The
 * connective tissue of a long conversation is therefore the model's own
 * (imperfect) output, not author-written fixtures — exactly what we need to
 * measure long-session entity retention and guided-mode step coherence.
 *
 * Freeze posture: NEW file. Reuses `evaluateResponse` from `evalRunner.ts` by
 * import only; nothing in `evalRunner.ts` / `evalScorer.ts` / `src/prompts/` is
 * touched.
 */

import type { ConversationScript } from "./conversationScripts";
import type { EvalCase } from "./evalRunner";
import { evaluateResponse } from "./evalRunner";

export interface TurnResult {
  /** 0-based index into `script.turns`. */
  turnIndex: number;
  user: string;
  response: string;
  /** True if the turn passed all of its criteria (context-only turns pass trivially). */
  passed: boolean;
  failures: string[];
  isProbe: boolean;
  /** Only meaningful when `isProbe` is true. */
  probePassed?: boolean;
  stepIndex?: number;
}

export interface ScriptResult {
  scriptId: string;
  mode: string;
  turns: TurnResult[];
  summary: {
    /** Turns carrying an `expect` block (excludes context-only and pure-probe turns). */
    scoredTurns: number;
    passedTurns: number;
    probes: number;
    probesPassed: number;
    /** True/false for guided scripts (`expectedSteps` set); null otherwise. */
    stepCoherent: boolean | null;
  };
}

export interface ConversationRunOptions {
  systemInstruction: string;
  generate: (messages: { role: string; content: string }[]) => Promise<string>;
  signal?: AbortSignal;
}

/**
 * Run a single conversation script, threading the model's real replies through
 * the accumulating history and scoring each turn.
 */
export async function runConversationScript(
  script: ConversationScript,
  opts: ConversationRunOptions
): Promise<ScriptResult> {
  // The accumulating, REAL conversation history. Starts empty; after each turn
  // we push the user message AND the model's reply, so by turn k the context
  // contains every model reply from turns 1..k-1.
  const history: { role: string; content: string }[] = [];
  const turnResults: TurnResult[] = [];

  // Records the observed step index for each `stepIndex`-bearing turn, in order,
  // but ONLY when that turn passed its `expect`. Used for step-coherence below.
  const observedSteps: number[] = [];

  for (let i = 0; i < script.turns.length; i++) {
    if (opts.signal?.aborted) break;
    const turn = script.turns[i];

    const messages = [
      { role: "system", content: opts.systemInstruction },
      ...history,
      { role: "user", content: turn.user },
    ];

    // Intentionally NOT wrapping with `buildPriorTurnRecap` — the whole point of
    // C1 is to measure raw accumulated context, not a re-surfaced recap. (C2 may
    // A/B the recap separately.)
    let response: string;
    try {
      response = await opts.generate(messages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      turnResults.push({
        turnIndex: i,
        user: turn.user,
        response: "",
        passed: false,
        failures: [`inference error: ${msg}`],
        isProbe: !!turn.retentionProbe,
        probePassed: turn.retentionProbe ? false : undefined,
        stepIndex: turn.stepIndex,
      });
      // Still thread an (empty) assistant turn so indices stay aligned.
      history.push({ role: "user", content: turn.user });
      history.push({ role: "assistant", content: "" });
      continue;
    }

    const failures: string[] = [];
    let isProbe = false;
    let probePassed: boolean | undefined;

    // --- Per-turn `expect` scoring (reuses evaluateResponse) ---
    if (turn.expect) {
      // Build a synthetic EvalCase whose priorTurns are the REAL accumulated
      // history. This is the behavior fixtures could never give us:
      // `mustEchoPriorTurn` now echoes against what the model actually said.
      const synthetic: EvalCase = {
        id: `${script.id}-t${i}`,
        dimension: "empathy",
        prompt: turn.user,
        expectedBehavior: "",
        priorTurns: history.filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            m.role === "user" || m.role === "assistant"
        ),
        passCriteria: turn.expect,
      };
      const r = evaluateResponse(response, synthetic);
      if (!r.passed) failures.push(...r.failures);
    }

    // --- Retention-probe scoring ---
    if (turn.retentionProbe) {
      isProbe = true;
      const lower = response.toLowerCase();
      probePassed = turn.retentionProbe.mustContainAny.some((t) =>
        lower.includes(t.toLowerCase())
      );
      if (!probePassed) {
        failures.push(
          `Retention probe failed: reply did not ground in "${turn.retentionProbe.entity}" ` +
            `(expected one of [${turn.retentionProbe.mustContainAny.join(", ")}])`
        );
      }
    }

    const passed = failures.length === 0;

    // Track step order for coherence: only count a step as "reached" if its
    // expect criteria passed, so a garbled reply at step 3 doesn't count as
    // legitimate progress.
    if (turn.stepIndex !== undefined && passed) {
      observedSteps.push(turn.stepIndex);
    }

    turnResults.push({
      turnIndex: i,
      user: turn.user,
      response,
      passed,
      failures,
      isProbe,
      probePassed,
      stepIndex: turn.stepIndex,
    });

    // Thread the REAL turn into history BEFORE the next iteration.
    history.push({ role: "user", content: turn.user });
    history.push({ role: "assistant", content: response });
  }

  // --- Step coherence (guided scripts only) ---
  // Coherent iff: every step turn passed its expect (so observedSteps has one
  // entry per declared step turn) AND the observed order is exactly 1,2,3,…
  // (monotonic, contiguous, no skips, no loops).
  let stepCoherent: boolean | null = null;
  if (script.expectedSteps !== undefined) {
    const declaredStepTurns = script.turns.filter(
      (t) => t.stepIndex !== undefined
    ).length;
    const allStepsPassed = observedSteps.length === declaredStepTurns;
    const monotonicContiguous = observedSteps.every(
      (s, idx) => s === idx + 1
    );
    stepCoherent =
      allStepsPassed &&
      monotonicContiguous &&
      observedSteps.length === script.expectedSteps;
  }

  const scoredTurns = turnResults.filter(
    (t) => script.turns[t.turnIndex].expect !== undefined
  ).length;
  const passedTurns = turnResults.filter(
    (t) => script.turns[t.turnIndex].expect !== undefined && t.passed
  ).length;
  const probes = turnResults.filter((t) => t.isProbe).length;
  const probesPassed = turnResults.filter((t) => t.isProbe && t.probePassed).length;

  return {
    scriptId: script.id,
    mode: script.mode,
    turns: turnResults,
    summary: { scoredTurns, passedTurns, probes, probesPassed, stepCoherent },
  };
}

/**
 * Render a set of script results as a markdown report (mirrors the truncation
 * style of `reportToMarkdown` in evalDriver.ts). The Node runner writes this to
 * `docs/eval-runs/<date>/conversation-scripts.md`.
 */
export function scriptReportToMarkdown(results: ScriptResult[]): string {
  const lines: string[] = [];
  lines.push("# Conversation-Script Eval Report");
  lines.push("");
  lines.push(`- **Scripts run**: ${results.length}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Script | Mode | Turns Passed | Probes Passed | Step-Coherent |");
  lines.push("|--------|------|--------------|---------------|---------------|");
  for (const r of results) {
    const s = r.summary;
    const coh =
      s.stepCoherent === null ? "—" : s.stepCoherent ? "yes" : "**NO**";
    lines.push(
      `| ${r.scriptId} | ${r.mode} | ${s.passedTurns}/${s.scoredTurns} | ${s.probesPassed}/${s.probes} | ${coh} |`
    );
  }
  lines.push("");

  for (const r of results) {
    lines.push(`## ${r.scriptId} (${r.mode})`);
    lines.push("");
    const failingTurns = r.turns.filter((t) => !t.passed);
    if (failingTurns.length === 0) {
      lines.push("_All turns passed._");
      lines.push("");
      continue;
    }
    lines.push("### Failing turns");
    lines.push("");
    for (const t of failingTurns) {
      const tag = t.isProbe ? " [probe]" : "";
      const step = t.stepIndex !== undefined ? ` [step ${t.stepIndex}]` : "";
      lines.push(`#### Turn ${t.turnIndex}${tag}${step}`);
      lines.push("");
      lines.push(`**User**: ${t.user}`);
      lines.push("");
      lines.push(`**Failures**: ${t.failures.join("; ")}`);
      lines.push("");
      const truncated =
        t.response.length > 300 ? t.response.slice(0, 300) + "..." : t.response;
      lines.push(`**Response**: ${truncated}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
