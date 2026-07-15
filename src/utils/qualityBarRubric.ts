/**
 * Quality-bar rubric scorer (model-quality M1, 2026-07-14).
 *
 * Scores a completed scenario run (a `ScriptResult` from the C1 driver, which
 * carries the model's REAL reply at every turn) against the per-turn rubric
 * set 2026-07-12: five dimensions, each 0–2 (fail/partial/pass):
 *
 *  - continuity      : no contradiction of a planted fact; reply non-degenerate
 *  - support         : a supportive move is present (question / validation /
 *                      second-person engagement)
 *  - personalization : callback turns only — grounds in a detail planted at an
 *                      EARLIER turn (strong term = 2, weak = 1)
 *  - noEcho          : opening n-gram overlap below the M1 thresholds
 *  - templateSmell   : no stock therapy-bot phrases
 *
 * Scenario PASS = total ≥ 85% of max AND zero turns scoring 0 on continuity
 * or support (and, at the initiative level, all release-gate floors intact —
 * checked by the gate, not here).
 *
 * These are deterministic string heuristics, not human judgment: continuity
 * and support are under-approximations (a contradiction we didn't enumerate
 * scores as fine). They are comparable across models — the baseline and the
 * fine-tuned model are scored by the SAME rubric, which is what M2/M3 need.
 */

import { scoreNoEcho, scoreTemplateSmell } from "./echoMetric";
import type { QualityBarScenario } from "./qualityBarScenarios";
import type { ScriptResult } from "./conversationDriver";

/** Validation vocabulary counted as an explicit supportive move. */
const SUPPORT_MARKERS: string[] = [
  "makes sense",
  "no wonder",
  "understandable",
  "that's hard",
  "that is hard",
  "that's a lot",
  "that is a lot",
  "hear you",
  "with you",
  "not nothing",
  "counts for",
  "well done",
  "glad you",
  "good that you",
  "took courage",
  "real step",
];

export function scoreSupport(reply: string): 0 | 1 | 2 {
  const lower = reply.toLowerCase();
  const asksQuestion = reply.includes("?");
  const validates = SUPPORT_MARKERS.some((m) => lower.includes(m));
  if (asksQuestion || validates) return 2;
  // Weak: at least engages the writer in second person.
  if (/\byou\b|\byour\b/.test(lower)) return 1;
  return 0;
}

export function scoreContinuity(
  reply: string,
  continuityBans: string[] | undefined
): 0 | 1 | 2 {
  const trimmed = reply.trim();
  if (trimmed.length === 0) return 0; // inference error / empty
  const lower = trimmed.toLowerCase();
  if (continuityBans?.some((b) => lower.includes(b.toLowerCase()))) return 0;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  if (words < 8) return 1; // degenerate but not contradictory
  return 2;
}

export interface TurnRubricScore {
  turnIndex: number;
  continuity: 0 | 1 | 2;
  support: 0 | 1 | 2;
  /** null = turn declares no callback; excluded from max. */
  personalization: 0 | 1 | 2 | null;
  noEcho: 0 | 1 | 2;
  templateSmell: 0 | 1 | 2;
  turnScore: number;
  turnMax: number;
}

export interface ScenarioRubricResult {
  scenarioId: string;
  mode: string;
  turnScores: TurnRubricScore[];
  totalScore: number;
  maxScore: number;
  percent: number;
  /** Turn indices scoring 0 on continuity or support (must be empty to pass). */
  zeroCriticalTurns: number[];
  passed: boolean;
  /** From the driver's trim telemetry: did 10 turns fit the 4096 budget? */
  firstTrimTurnIndex: number | null;
}

export const QUALITY_BAR_PASS_PERCENT = 0.85;

export function scoreScenario(
  scenario: QualityBarScenario,
  run: ScriptResult
): ScenarioRubricResult {
  const turnScores: TurnRubricScore[] = [];

  for (const turn of run.turns) {
    const meta = scenario.meta[turn.turnIndex] ?? {};
    const reply = turn.response;
    const lower = reply.toLowerCase();

    const continuity = scoreContinuity(reply, meta.continuityBans);
    const support = scoreSupport(reply);
    const noEcho = scoreNoEcho(turn.user, reply);
    const templateSmell = scoreTemplateSmell(reply);

    let personalization: 0 | 1 | 2 | null = null;
    if (meta.callback) {
      if (meta.callback.strongTerms.some((t) => lower.includes(t.toLowerCase()))) {
        personalization = 2;
      } else if (
        meta.callback.weakTerms?.some((t) => lower.includes(t.toLowerCase()))
      ) {
        personalization = 1;
      } else {
        personalization = 0;
      }
    }

    const dims: number[] = [continuity, support, noEcho, templateSmell];
    const turnMax = 8 + (personalization === null ? 0 : 2);
    const turnScore =
      dims.reduce((a: number, b: number) => a + b, 0) + (personalization ?? 0);

    turnScores.push({
      turnIndex: turn.turnIndex,
      continuity,
      support,
      personalization,
      noEcho,
      templateSmell,
      turnScore,
      turnMax,
    });
  }

  const totalScore = turnScores.reduce((a, t) => a + t.turnScore, 0);
  const maxScore = turnScores.reduce((a, t) => a + t.turnMax, 0);
  const percent = maxScore === 0 ? 0 : totalScore / maxScore;
  const zeroCriticalTurns = turnScores
    .filter((t) => t.continuity === 0 || t.support === 0)
    .map((t) => t.turnIndex);
  const passed =
    percent >= QUALITY_BAR_PASS_PERCENT && zeroCriticalTurns.length === 0;

  return {
    scenarioId: scenario.script.id,
    mode: scenario.script.mode,
    turnScores,
    totalScore,
    maxScore,
    percent,
    zeroCriticalTurns,
    passed,
    firstTrimTurnIndex: run.summary.firstTrimTurnIndex,
  };
}

export function rubricReportToMarkdown(
  results: ScenarioRubricResult[],
  modelLabel: string
): string {
  const lines: string[] = [];
  lines.push(`# Quality-Bar Rubric Report`);
  lines.push("");
  lines.push(`Model: ${modelLabel}. Generated ${new Date().toISOString()}.`);
  lines.push(
    `Pass = every scenario ≥ ${Math.round(QUALITY_BAR_PASS_PERCENT * 100)}% ` +
      `of max AND zero turns scoring 0 on continuity or support.`
  );
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Scenario | Mode | Score | % | Zero-critical turns | First trim | Pass |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  for (const r of results) {
    lines.push(
      `| ${r.scenarioId} | ${r.mode} | ${r.totalScore}/${r.maxScore} | ` +
        `${Math.round(r.percent * 100)}% | ` +
        `${r.zeroCriticalTurns.length === 0 ? "—" : r.zeroCriticalTurns.join(", ")} | ` +
        `${r.firstTrimTurnIndex === null ? "none" : `t${r.firstTrimTurnIndex}`} | ` +
        `${r.passed ? "✅" : "❌"} |`
    );
  }
  lines.push("");
  for (const r of results) {
    lines.push(`## ${r.scenarioId}`);
    lines.push("");
    lines.push(`| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |`);
    lines.push(`|---|---|---|---|---|---|---|`);
    for (const t of r.turnScores) {
      lines.push(
        `| ${t.turnIndex} | ${t.continuity} | ${t.support} | ` +
          `${t.personalization === null ? "—" : t.personalization} | ` +
          `${t.noEcho} | ${t.templateSmell} | ${t.turnScore}/${t.turnMax} |`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}
