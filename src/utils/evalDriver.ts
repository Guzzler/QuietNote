import type { EvalCase, EvalResult, EvalDimension } from "./evalRunner";
import { EVAL_CASES, evaluateResponse } from "./evalRunner";
import { buildPriorTurnRecap } from "./conversationContext";

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

    const r = evaluateResponse(response, c);
    results.push(r);
    opts.onProgress?.(i + 1, cases.length, r);
  }

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
    startedAt,
    finishedAt: new Date().toISOString(),
    modelLabel,
    systemInstruction: opts.systemInstruction,
    ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      byDimension,
      medicalRefusalDirect,
      medicalRefusalIndirect,
    },
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
