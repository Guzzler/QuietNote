/**
 * Conversation driver for scripted multi-turn evals (Track C1 2026-06-18; trim
 * instrumentation + context strategies added Track C2 2026-06-19).
 *
 * The heart of C1: unlike `evalDriver.ts` (which builds ONE message array from
 * canned `priorTurns` and calls `generate` once), this driver threads the
 * model's REAL reply at turn k into the accumulated context for turn k+1. The
 * connective tissue of a long conversation is therefore the model's own
 * (imperfect) output, not author-written fixtures — exactly what we need to
 * measure long-session entity retention and guided-mode step coherence.
 *
 * C2 adds a selectable **context strategy** so the driver can run each script
 * the way the C1 mock ran it (`raw`, full untrimmed history) OR the way the
 * real app actually sends (`managed`, via `buildManagedMessages` = recap +
 * trim), OR a trim-only ablation (`managed-norecap`) that isolates the
 * prior-turn recap's contribution. Per-turn trim telemetry records exactly
 * when/what gets dropped at the 4096-token boundary, closing the measurement
 * half of Fundamental Problem #2.
 *
 * Freeze posture: NEW file. Reuses `evaluateResponse` from `evalRunner.ts` and
 * `buildManagedMessages`/`trimConversationHistory`/`buildPriorTurnRecap` from
 * the (untouched) token/context utils by import only. `managed-norecap`
 * deliberately replicates `buildManagedMessages`'s budget math here rather than
 * adding a recap-suppression flag to that frozen-adjacent util.
 */

import type { ConversationScript } from "./conversationScripts";
import type { EvalCase } from "./evalRunner";
import { evaluateResponse } from "./evalRunner";
import {
  buildManagedMessages,
  trimConversationHistory,
  estimateTokens,
  MODEL_CONTEXT_LIMIT,
  RESERVED_FOR_GENERATION,
  type SimpleMessage,
} from "./tokenEstimator";
import { buildPriorTurnRecap } from "./conversationContext";

/**
 * How the driver assembles the context fed to the model each turn.
 *  - `raw`            : system + FULL untrimmed history + user (C1 default).
 *  - `managed`        : the EXACT real-app send path — `buildManagedMessages`
 *                       (prior-turn recap prepended to the user turn + oldest
 *                       history trimmed to fit the 4096 budget).
 *  - `managed-norecap`: trim only, NO recap — isolates the recap's effect.
 */
export type ContextStrategy = "raw" | "managed" | "managed-norecap";

export const CONTEXT_STRATEGIES: ContextStrategy[] = [
  "raw",
  "managed",
  "managed-norecap",
];

/**
 * Per-turn context telemetry. Records what actually happened to the context
 * window on the turn — the data that answers "when, and what, gets trimmed at
 * 4096, and does the recap save the entity that got trimmed out?".
 */
export interface TurnContextInfo {
  strategy: ContextStrategy;
  /** estimateTokens summed over the history messages actually fed this turn. */
  estHistoryTokens: number;
  trimmed: boolean;
  /** originalCount - keptCount from the trim result (0 for `raw`). */
  droppedTurns: number;
  /** True if a non-empty `buildPriorTurnRecap` was prepended to the user turn. */
  recapPresent: boolean;
  /**
   * For probe turns only: was the entity's ORIGINAL establishing turn still
   * inside the (possibly trimmed) history window fed to the model this turn —
   * i.e. is any `retentionProbe.mustContainAny` term present in the raw history
   * messages (EXCLUDING the recap)? If the entity is absent from the window but
   * the probe still PASSES, that pass is attributable to the recap (or to the
   * model's own surviving earlier replies) — the single most useful correlation
   * in the C2 report.
   */
  probeEntityInWindow?: boolean;
}

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
  /** Context-window telemetry for this turn (always populated). */
  context: TurnContextInfo;
}

export interface ScriptResult {
  scriptId: string;
  mode: string;
  /** The context strategy this run used. */
  strategy: ContextStrategy;
  turns: TurnResult[];
  summary: {
    /** Turns carrying an `expect` block (excludes context-only and pure-probe turns). */
    scoredTurns: number;
    passedTurns: number;
    probes: number;
    probesPassed: number;
    /** True/false for guided scripts (`expectedSteps` set); null otherwise. */
    stepCoherent: boolean | null;
    /** First turn index where the history was trimmed; null if never trimmed. */
    firstTrimTurnIndex: number | null;
    /** Probes whose turn index is strictly before `firstTrimTurnIndex`. */
    probesPassedBeforeTrim: number;
    /** Probes whose turn index is at/after `firstTrimTurnIndex` that passed. */
    probesPassedAfterTrim: number;
    /** Denominator for the after-trim pass rate. */
    probesAfterTrim: number;
  };
}

export interface ConversationRunOptions {
  systemInstruction: string;
  generate: (messages: { role: string; content: string }[]) => Promise<string>;
  signal?: AbortSignal;
  /** Context-assembly strategy. Default `"raw"` keeps C1 behavior unchanged. */
  strategy?: ContextStrategy;
}

/**
 * Result of assembling the context for one turn under a given strategy: the
 * full messages array to send, plus the raw history window (the trimmed history
 * messages, WITHOUT the recap or the final user turn) used for the
 * `probeEntityInWindow` scan, and the telemetry.
 */
interface BuiltTurnContext {
  messages: SimpleMessage[];
  /** The history messages actually fed (post-trim), excluding the recap/user. */
  historyWindow: SimpleMessage[];
  trimmed: boolean;
  droppedTurns: number;
  recapPresent: boolean;
}

/**
 * Assemble the messages for one turn under the selected strategy.
 *
 * `managed-norecap` replicates `buildManagedMessages`'s budget math locally
 * (history budget = MODEL_CONTEXT_LIMIT - RESERVED_FOR_GENERATION - systemTokens
 * - entryTokens) so the ONLY difference from `managed` is the absent recap, not
 * the budget. We do not add a recap-suppression flag to `buildManagedMessages`
 * (that would edit a frozen-adjacent util's surface).
 */
function buildTurnContext(
  strategy: ContextStrategy,
  systemInstruction: string,
  userTurn: string,
  history: SimpleMessage[]
): BuiltTurnContext {
  if (strategy === "raw") {
    return {
      messages: [
        { role: "system", content: systemInstruction },
        ...history,
        { role: "user", content: userTurn },
      ],
      historyWindow: history,
      trimmed: false,
      droppedTurns: 0,
      recapPresent: false,
    };
  }

  if (strategy === "managed") {
    // The EXACT app send path: recap prepended to the user turn + trim.
    const { messages, trimResult } = buildManagedMessages(
      systemInstruction,
      userTurn,
      history
    );
    const recap = buildPriorTurnRecap(history);
    return {
      messages,
      historyWindow: trimResult.messages,
      trimmed: trimResult.trimmed,
      droppedTurns: trimResult.originalCount - trimResult.keptCount,
      recapPresent: recap !== null,
    };
  }

  // strategy === "managed-norecap": trim only, no recap. Faithful to
  // buildManagedMessages's budget math but with entry = the bare user turn.
  const systemTokens = estimateTokens(systemInstruction);
  const entryTokens = estimateTokens(userTurn);
  const historyBudget = Math.max(
    0,
    MODEL_CONTEXT_LIMIT - RESERVED_FOR_GENERATION - systemTokens - entryTokens
  );
  const trimResult = trimConversationHistory(history, historyBudget);
  return {
    messages: [
      { role: "system", content: systemInstruction },
      ...trimResult.messages,
      { role: "user", content: userTurn },
    ],
    historyWindow: trimResult.messages,
    trimmed: trimResult.trimmed,
    droppedTurns: trimResult.originalCount - trimResult.keptCount,
    recapPresent: false,
  };
}

/**
 * Run a single conversation script, threading the model's real replies through
 * the accumulating history and scoring each turn.
 */
export async function runConversationScript(
  script: ConversationScript,
  opts: ConversationRunOptions
): Promise<ScriptResult> {
  const strategy: ContextStrategy = opts.strategy ?? "raw";

  // The accumulating, REAL conversation history. Starts empty; after each turn
  // we push the user message AND the model's reply, so by turn k the context
  // contains every model reply from turns 1..k-1.
  const history: SimpleMessage[] = [];
  const turnResults: TurnResult[] = [];

  // Records the observed step index for each `stepIndex`-bearing turn, in order,
  // but ONLY when that turn passed its `expect`. Used for step-coherence below.
  const observedSteps: number[] = [];

  for (let i = 0; i < script.turns.length; i++) {
    if (opts.signal?.aborted) break;
    const turn = script.turns[i];

    const built = buildTurnContext(
      strategy,
      opts.systemInstruction,
      turn.user,
      history
    );

    const estHistoryTokens = built.historyWindow.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0
    );

    // probeEntityInWindow: for probe turns, was the entity still inside the raw
    // history window (excluding the recap)? Scan only the history messages.
    let probeEntityInWindow: boolean | undefined;
    if (turn.retentionProbe) {
      const windowLower = built.historyWindow
        .map((m) => m.content.toLowerCase())
        .join("\n");
      probeEntityInWindow = turn.retentionProbe.mustContainAny.some((t) =>
        windowLower.includes(t.toLowerCase())
      );
    }

    const context: TurnContextInfo = {
      strategy,
      estHistoryTokens,
      trimmed: built.trimmed,
      droppedTurns: built.droppedTurns,
      recapPresent: built.recapPresent,
      probeEntityInWindow,
    };

    let response: string;
    try {
      response = await opts.generate(built.messages);
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
        context,
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
      context,
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

  // --- Trim-relative probe split ---
  // firstTrimTurnIndex partitions probes into "before the first trim" (the
  // entity was definitely still in the raw window) and "at/after the first
  // trim" (the window may have lost the entity — the case that stresses the
  // recap). If the conversation never trims, all probes count as "before".
  const firstTrimmed = turnResults.find((t) => t.context.trimmed);
  const firstTrimTurnIndex = firstTrimmed ? firstTrimmed.turnIndex : null;
  let probesPassedBeforeTrim = 0;
  let probesPassedAfterTrim = 0;
  let probesAfterTrim = 0;
  for (const t of turnResults) {
    if (!t.isProbe) continue;
    const afterTrim =
      firstTrimTurnIndex !== null && t.turnIndex >= firstTrimTurnIndex;
    if (afterTrim) {
      probesAfterTrim += 1;
      if (t.probePassed) probesPassedAfterTrim += 1;
    } else if (t.probePassed) {
      probesPassedBeforeTrim += 1;
    }
  }

  return {
    scriptId: script.id,
    mode: script.mode,
    strategy,
    turns: turnResults,
    summary: {
      scoredTurns,
      passedTurns,
      probes,
      probesPassed,
      stepCoherent,
      firstTrimTurnIndex,
      probesPassedBeforeTrim,
      probesPassedAfterTrim,
      probesAfterTrim,
    },
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
  const strategies = Array.from(new Set(results.map((r) => r.strategy)));
  lines.push(`- **Strategies**: ${strategies.join(", ")}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(
    "| Script | Mode | Strategy | Turns Passed | Probes Passed | Step-Coherent | First-Trim Turn | Probes After-Trim |"
  );
  lines.push(
    "|--------|------|----------|--------------|---------------|---------------|-----------------|-------------------|"
  );
  for (const r of results) {
    const s = r.summary;
    const coh =
      s.stepCoherent === null ? "—" : s.stepCoherent ? "yes" : "**NO**";
    const firstTrim =
      s.firstTrimTurnIndex === null ? "—" : String(s.firstTrimTurnIndex);
    const afterTrim =
      s.probesAfterTrim === 0
        ? "—"
        : `${s.probesPassedAfterTrim}/${s.probesAfterTrim}`;
    lines.push(
      `| ${r.scriptId} | ${r.mode} | ${r.strategy} | ${s.passedTurns}/${s.scoredTurns} | ${s.probesPassed}/${s.probes} | ${coh} | ${firstTrim} | ${afterTrim} |`
    );
  }
  lines.push("");

  for (const r of results) {
    lines.push(`## ${r.scriptId} (${r.mode}, ${r.strategy})`);
    lines.push("");

    // Per-script context telemetry table — the C2 instrumentation payload.
    lines.push("### Context telemetry");
    lines.push("");
    lines.push("| Turn | Est. history tokens | Trimmed | Dropped | Recap | Probe in window |");
    lines.push("|------|---------------------|---------|---------|-------|-----------------|");
    for (const t of r.turns) {
      const c = t.context;
      const probeWin =
        c.probeEntityInWindow === undefined
          ? "—"
          : c.probeEntityInWindow
            ? "yes"
            : "**no**";
      lines.push(
        `| ${t.turnIndex} | ${c.estHistoryTokens} | ${c.trimmed ? "yes" : "no"} | ${c.droppedTurns} | ${c.recapPresent ? "yes" : "no"} | ${probeWin} |`
      );
    }
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
