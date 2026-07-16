/**
 * In-browser M1 baseline runner (model-quality M1b, 2026-07-16).
 *
 * The M1 instrument (echo cases + three 10-turn quality-bar scenarios) exists
 * and has a headless Node path (`npm run eval:m1`), but WebLLM and MediaPipe
 * are browser-bound — their baselines need the REAL engines running in the
 * app. This module packages the exact headless procedure as a pure function
 * the dev-only EvalPanel can drive against a live `InferenceEngine`:
 *
 *   1. ECHO_EVAL_CASES — 10 single-turn echo-temptation cases.
 *   2. QUALITY_BAR_SCENARIOS — three 10-turn scenarios via the C1 driver on
 *      the `managed` strategy (the real app send path: recap + trim), scored
 *      by the quality-bar rubric.
 *
 * Faithfulness contract (mirrors scripts/run-m1-baseline.ts so browser and
 * headless numbers are comparable):
 *   - system prompt = getBaseSystemInstruction(mode, { morning: false })
 *   - deflection guard applied (isBareDeflection → one reprompt), no referral
 *     guard (scenarios contain no crisis/medical content)
 *   - the CALLER supplies generation options via its `generate` — EvalPanel
 *     passes the app's send-path options (temperature 0.6, maxTokens 200,
 *     repetitionPenalty 1.3, App.tsx:389/584)
 *
 * Freeze posture: NEW file, imports only. `EVAL_CASES`, floors, prompts, and
 * the M1 instrument files are untouched.
 */

import { getBaseSystemInstruction } from "../prompts/systemPrompts";
import { isBareDeflection, withDeflectionReprompt } from "./responseShaping";
import { ECHO_EVAL_CASES } from "./echoEvalCases";
import {
  firstSentence,
  maxNgramOverlap,
  scoreNoEcho,
  templateSmellCount,
} from "./echoMetric";
import { QUALITY_BAR_SCENARIOS } from "./qualityBarScenarios";
import {
  scoreScenario,
  rubricReportToMarkdown,
  type ScenarioRubricResult,
} from "./qualityBarRubric";
import { runConversationScript, type ScriptResult } from "./conversationDriver";

export type M1Generate = (
  messages: { role: string; content: string }[]
) => Promise<string>;

export interface M1EchoRow {
  id: string;
  mode: string;
  overlap: number;
  noEcho: 0 | 1 | 2;
  smells: number;
  opening: string;
}

export interface M1Progress {
  /** e.g. "echo echo-fw-1 (3/10)" or "scenario qb-freewrite-arc turn 4/10" */
  label: string;
  done: number;
  total: number;
}

export interface M1RunOptions {
  generate: M1Generate;
  modelLabel: string;
  signal?: AbortSignal;
  onProgress?: (p: M1Progress) => void;
}

export interface M1RunResult {
  modelLabel: string;
  echoRows: M1EchoRow[];
  scenarioResults: ScenarioRubricResult[];
  /** Raw driver runs (full transcripts) parallel to `scenarioResults`. */
  runs: ScriptResult[];
}

/** Echo cases + 10 turns per scenario — used for progress denominators. */
export function m1TotalSteps(): number {
  return (
    ECHO_EVAL_CASES.length +
    QUALITY_BAR_SCENARIOS.reduce((a, s) => a + s.script.turns.length, 0)
  );
}

export async function runM1Baseline(opts: M1RunOptions): Promise<M1RunResult> {
  const total = m1TotalSteps();
  let done = 0;

  // App-faithful send path (deflection guard only — see header note).
  const generate: M1Generate = async (messages) => {
    const first = await opts.generate(messages);
    return isBareDeflection(first)
      ? opts.generate(withDeflectionReprompt(messages))
      : first;
  };

  const echoRows: M1EchoRow[] = [];
  for (const c of ECHO_EVAL_CASES) {
    if (opts.signal?.aborted) throw new Error("aborted");
    opts.onProgress?.({ label: `echo ${c.id}`, done, total });
    const reply = await generate([
      { role: "system", content: getBaseSystemInstruction(c.mode, { morning: false }) },
      { role: "user", content: c.prompt },
    ]);
    echoRows.push({
      id: c.id,
      mode: c.mode,
      overlap: maxNgramOverlap(c.prompt, reply),
      noEcho: scoreNoEcho(c.prompt, reply),
      smells: templateSmellCount(reply),
      opening: firstSentence(reply),
    });
    done += 1;
  }

  const scenarioResults: ScenarioRubricResult[] = [];
  const runs: ScriptResult[] = [];
  for (const scenario of QUALITY_BAR_SCENARIOS) {
    if (opts.signal?.aborted) throw new Error("aborted");
    let turn = 0;
    const run = await runConversationScript(scenario.script, {
      systemInstruction: getBaseSystemInstruction(scenario.script.mode, {
        morning: false,
      }),
      generate: (messages) => {
        opts.onProgress?.({
          label: `scenario ${scenario.script.id} turn ${++turn}/${scenario.script.turns.length}`,
          done,
          total,
        });
        done += 1;
        return generate(messages);
      },
      signal: opts.signal,
      strategy: "managed", // the real app send path (recap + trim)
    });
    runs.push(run);
    scenarioResults.push(scoreScenario(scenario, run));
  }

  return { modelLabel: opts.modelLabel, echoRows, scenarioResults, runs };
}

/**
 * Full markdown report: echo table + rubric report + complete transcripts,
 * in one document so a browser run can be copied out and committed under
 * `docs/eval-runs/` in a single artifact.
 */
export function m1ResultToMarkdown(result: M1RunResult): string {
  const lines: string[] = [];
  lines.push(`# M1 Baseline (in-browser) — ${result.modelLabel}`);
  lines.push("");
  lines.push(`Generated ${new Date().toISOString()}.`);
  lines.push("");

  lines.push(`## Echo cases (single-turn)`);
  lines.push("");
  lines.push(`| id | mode | overlap | no-echo (0–2) | template smells | reply opening |`);
  lines.push(`|---|---|---|---|---|---|`);
  for (const r of result.echoRows) {
    lines.push(
      `| ${r.id} | ${r.mode} | ${r.overlap.toFixed(2)} | ${r.noEcho} | ${r.smells} | ${r.opening.replace(/\|/g, "\\|").slice(0, 100)} |`
    );
  }
  const pass = result.echoRows.filter((r) => r.noEcho === 2).length;
  const meanOverlap =
    result.echoRows.length === 0
      ? 0
      : result.echoRows.reduce((a, r) => a + r.overlap, 0) / result.echoRows.length;
  lines.push("");
  lines.push(
    `**Headline: ${pass}/${result.echoRows.length} cases open without echo (score 2); ` +
      `mean overlap ${meanOverlap.toFixed(2)}.**`
  );
  lines.push("");

  lines.push(rubricReportToMarkdown(result.scenarioResults, result.modelLabel));
  lines.push("");

  for (const run of result.runs) {
    lines.push(`## Transcript: ${run.scriptId}`);
    lines.push("");
    for (const t of run.turns) {
      lines.push(`### Turn ${t.turnIndex}`);
      lines.push("");
      lines.push(`**User**: ${t.user}`);
      lines.push("");
      lines.push(`**Model**: ${t.response}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
