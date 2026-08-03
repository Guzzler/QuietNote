import type { EvalCase, EvalResult, EvalDimension } from "./evalRunner";
import { EVAL_CASES, evaluateResponse } from "./evalRunner";
import { buildPriorTurnRecap } from "./conversationContext";
import { stripUnmatchedLeadingQuote, stripSelfQuotingWrapper } from "./replyCleanup";

/**
 * The App finalize point's reply cleanup, in the app's own order. Kept as one
 * function so the live path and the `--rescore` path can never drift apart.
 * M11 (2026-07-31) + M11b (2026-08-01).
 */
function cleanReply(response: string): string {
  return stripSelfQuotingWrapper(stripUnmatchedLeadingQuote(response));
}

export interface EvalRunOptions {
  systemInstruction: string;
  generate: (messages: { role: string; content: string }[]) => Promise<string>;
  dimensions?: EvalDimension[];
  onProgress?: (done: number, total: number, last: EvalResult) => void;
  signal?: AbortSignal;
  /**
   * Sampling seed this run was generated under (M9, 2026-07-29) — recorded
   * only, never used for scoring. A run artifact that doesn't state its own
   * seed is not replayable, which is what blocked M8's attribution. Omitted
   * (not `null`) when the run had no pinned seed, so pre-M9 artifacts keep
   * their exact shape.
   */
  seed?: number;
}

export interface EvalRunReport {
  startedAt: string;
  finishedAt: string;
  modelLabel: string;
  systemInstruction: string;
  seed?: number;
  results: EvalResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    byDimension: Record<string, { passed: number; failed: number; total: number }>;
    medicalRefusalDirect: { passed: number; failed: number; total: number };
    medicalRefusalIndirect: { passed: number; failed: number; total: number };
  };
}

export async function runEvalSuite(
  opts: EvalRunOptions,
  modelLabel: string = "unknown"
): Promise<EvalRunReport> {
  const cases: EvalCase[] = opts.dimensions
    ? EVAL_CASES.filter((c) => opts.dimensions!.includes(c.dimension))
    : [...EVAL_CASES];

  const results: EvalResult[] = [];
  const startedAt = new Date().toISOString();

  for (let i = 0; i < cases.length; i++) {
    if (opts.signal?.aborted) break;

    const c = cases[i];
    let response: string;
    try {
      const recap = buildPriorTurnRecap(c.priorTurns ?? []);
      const currentUserContent = recap ? `${recap}\n\n${c.prompt}` : c.prompt;
      response = await opts.generate([
        { role: "system", content: opts.systemInstruction },
        ...(c.priorTurns ?? []),
        { role: "user", content: currentUserContent },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        caseId: c.id,
        dimension: c.dimension,
        passed: false,
        failures: [`inference error: ${msg}`],
        response: "",
      });
      opts.onProgress?.(i + 1, cases.length, results[results.length - 1]);
      continue;
    }

    // M11 (2026-07-31): app-faithfulness. The App finalize point strips a
    // stray unmatched leading quote after truncation and before the
    // guardrails; the eval must match the same relative position — after
    // reply assembly (post referral-reprompt), before matching. Grounded
    // no-op on the current corpora (0 of 900 replies begin with a quote),
    // which is what makes the `--rescore` delta a real zero-check.
    const r = evaluateResponse(cleanReply(response), c);
    results.push(r);
    opts.onProgress?.(i + 1, cases.length, r);
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    modelLabel,
    systemInstruction: opts.systemInstruction,
    ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    results,
    summary: summarizeResults(results, cases),
  };
}

/**
 * Tally a set of scored results. Extracted from `runEvalSuite` (M9,
 * 2026-07-29) so the offline `--rescore` path builds its summary through the
 * exact same code — a re-score whose tallies were computed by a second
 * implementation would be a new instrument, which is the opposite of the
 * point.
 */
export function summarizeResults(
  results: EvalResult[],
  cases: EvalCase[]
): EvalRunReport["summary"] {
  const byDimension: Record<string, { passed: number; failed: number; total: number }> = {};
  const medicalRefusalDirect = { passed: 0, failed: 0, total: 0 };
  const medicalRefusalIndirect = { passed: 0, failed: 0, total: 0 };
  const caseById = new Map(cases.map((c) => [c.id, c]));
  for (const r of results) {
    if (!byDimension[r.dimension]) {
      byDimension[r.dimension] = { passed: 0, failed: 0, total: 0 };
    }
    byDimension[r.dimension].total++;
    if (r.passed) byDimension[r.dimension].passed++;
    else byDimension[r.dimension].failed++;

    if (r.dimension === "medical_refusal") {
      const c = caseById.get(r.caseId);
      if (c && c.medicalIndirect !== undefined) {
        const bucket = c.medicalIndirect ? medicalRefusalIndirect : medicalRefusalDirect;
        bucket.total++;
        if (r.passed) bucket.passed++;
        else bucket.failed++;
      }
    }
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    byDimension,
    medicalRefusalDirect,
    medicalRefusalIndirect,
  };
}

/**
 * Offline re-score (M9, 2026-07-29): score an existing corpus of *stored*
 * replies against the current matchers — no model, no endpoint, no
 * generation. This is what M8 needed and did not have: it had to regenerate,
 * so its matcher-repair delta was confounded with sampling noise.
 *
 * Every stored reply is the exact string the matchers saw on the original run
 * (post referral-reprompt), so scoring it again isolates the matcher change.
 * A stored id with no matching case in the CURRENT `EVAL_CASES` is a hard
 * error — silently dropping it would quietly shrink the denominator, which is
 * precisely the kind of unnoticed instrument change the gate exists to catch.
 */
export function rescoreStoredReplies(
  storedReplies: Record<string, string>,
  cases: EvalCase[],
  meta: { modelLabel: string; systemInstruction: string; seed?: number; startedAt?: string }
): EvalRunReport {
  const caseById = new Map(cases.map((c) => [c.id, c]));
  const unknown = Object.keys(storedReplies).filter((id) => !caseById.has(id));
  if (unknown.length > 0) {
    throw new Error(
      `rescoreStoredReplies: ${unknown.length} stored case id(s) are not in the ` +
        `current EVAL_CASES and cannot be scored: ${unknown.join(", ")}`
    );
  }
  const scoredCases: EvalCase[] = [];
  const results: EvalResult[] = [];
  for (const [id, response] of Object.entries(storedReplies)) {
    const c = caseById.get(id)!;
    scoredCases.push(c);
    // M11: same cleanup on the re-score path, so a stored corpus is scored
    // through exactly the pipeline a live run uses.
    results.push(evaluateResponse(cleanReply(response), c));
  }
  const now = new Date().toISOString();
  return {
    startedAt: meta.startedAt ?? now,
    finishedAt: now,
    modelLabel: meta.modelLabel,
    systemInstruction: meta.systemInstruction,
    ...(meta.seed !== undefined ? { seed: meta.seed } : {}),
    results,
    summary: summarizeResults(results, scoredCases),
  };
}

export function reportToMarkdown(report: EvalRunReport): string {
  const lines: string[] = [];
  lines.push(`# Eval Report — ${report.modelLabel}`);
  lines.push("");
  lines.push(`- **Started**: ${report.startedAt}`);
  lines.push(`- **Finished**: ${report.finishedAt}`);
  // M9: state the seed in the artifact itself when the run pinned one.
  if (report.seed !== undefined) lines.push(`- **Seed**: ${report.seed}`);
  lines.push(`- **Total cases**: ${report.summary.total}`);
  lines.push(`- **Passed**: ${report.summary.passed} (${Math.round((report.summary.passed / report.summary.total) * 100)}%)`);
  lines.push(`- **Failed**: ${report.summary.failed}`);
  lines.push("");

  lines.push("## Results by Dimension");
  lines.push("");
  lines.push("| Dimension | Passed | Failed | Total | Pass Rate |");
  lines.push("|-----------|--------|--------|-------|-----------|");
  for (const [dim, stats] of Object.entries(report.summary.byDimension)) {
    const rate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
    lines.push(`| ${dim} | ${stats.passed} | ${stats.failed} | ${stats.total} | ${rate}% |`);
  }
  lines.push("");

  // Medical refusal — direct vs indirect split (added 2026-05-30)
  const mrDirect = report.summary.medicalRefusalDirect;
  const mrIndirect = report.summary.medicalRefusalIndirect;
  if (mrDirect.total > 0 || mrIndirect.total > 0) {
    lines.push("## Medical Refusal — Direct vs Indirect");
    lines.push("");
    lines.push("| Cohort | Passed | Failed | Total | Pass Rate |");
    lines.push("|--------|--------|--------|-------|-----------|");
    const dRate = mrDirect.total > 0 ? Math.round((mrDirect.passed / mrDirect.total) * 100) : 0;
    const iRate = mrIndirect.total > 0 ? Math.round((mrIndirect.passed / mrIndirect.total) * 100) : 0;
    lines.push(`| medical_refusal_direct | ${mrDirect.passed} | ${mrDirect.failed} | ${mrDirect.total} | ${dRate}% |`);
    lines.push(`| medical_refusal_indirect | ${mrIndirect.passed} | ${mrIndirect.failed} | ${mrIndirect.total} | ${iRate}% |`);
    lines.push("");
  }

  // Weakest dimensions
  const sorted = Object.entries(report.summary.byDimension)
    .map(([dim, stats]) => ({ dim, rate: stats.total > 0 ? stats.passed / stats.total : 1 }))
    .sort((a, b) => a.rate - b.rate);
  lines.push("## Weakest Dimensions");
  lines.push("");
  for (const { dim, rate } of sorted.slice(0, 3)) {
    lines.push(`1. **${dim}** — ${Math.round(rate * 100)}% pass rate`);
  }
  lines.push("");

  // Failed cases detail
  const failed = report.results.filter((r) => !r.passed);
  if (failed.length > 0) {
    lines.push("## Failed Cases");
    lines.push("");
    for (const r of failed) {
      lines.push(`### ${r.caseId} (${r.dimension})`);
      lines.push("");
      lines.push(`**Failures**: ${r.failures.join("; ")}`);
      lines.push("");
      const truncated = r.response.length > 300 ? r.response.slice(0, 300) + "..." : r.response;
      lines.push(`**Response**: ${truncated}`);
      lines.push("");
    }
  }

  // Sample passing cases — always include every passing multi-turn (empathy-mt-*)
  // body so a flipped mt-* case past position 5 is never silently dropped from
  // the rendered report (renderer-only; PASS/FAIL logic unchanged).
  const passing = report.results.filter((r) => r.passed);
  if (passing.length > 0) {
    const isMT = (r: EvalResult) => r.caseId.startsWith("empathy-mt");
    const mtPasses = passing.filter(isMT);
    const others = passing.filter((r) => !isMT(r)).slice(0, 5);
    const seen = new Set<string>();
    const sample = [...mtPasses, ...others].filter((r) => {
      if (seen.has(r.caseId)) return false;
      seen.add(r.caseId);
      return true;
    });
    lines.push("## Sample Passing Cases");
    lines.push("");
    for (const r of sample) {
      lines.push(`### ${r.caseId} (${r.dimension})`);
      lines.push("");
      const truncated = r.response.length > 300 ? r.response.slice(0, 300) + "..." : r.response;
      lines.push(`**Response**: ${truncated}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
