import type { EvalCase, EvalResult, EvalDimension } from "./evalRunner";
import { EVAL_CASES, evaluateResponse } from "./evalRunner";

export interface EvalRunOptions {
  systemInstruction: string;
  generate: (messages: { role: string; content: string }[]) => Promise<string>;
  dimensions?: EvalDimension[];
  onProgress?: (done: number, total: number, last: EvalResult) => void;
  signal?: AbortSignal;
}

export interface EvalRunReport {
  startedAt: string;
  finishedAt: string;
  modelLabel: string;
  systemInstruction: string;
  results: EvalResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    byDimension: Record<string, { passed: number; failed: number; total: number }>;
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
      response = await opts.generate([
        { role: "system", content: opts.systemInstruction },
        ...(c.priorTurns ?? []),
        { role: "user", content: c.prompt },
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
  for (const r of results) {
    if (!byDimension[r.dimension]) {
      byDimension[r.dimension] = { passed: 0, failed: 0, total: 0 };
    }
    byDimension[r.dimension].total++;
    if (r.passed) byDimension[r.dimension].passed++;
    else byDimension[r.dimension].failed++;
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    modelLabel,
    systemInstruction: opts.systemInstruction,
    results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      byDimension,
    },
  };
}

export function reportToMarkdown(report: EvalRunReport): string {
  const lines: string[] = [];
  lines.push(`# Eval Report — ${report.modelLabel}`);
  lines.push("");
  lines.push(`- **Started**: ${report.startedAt}`);
  lines.push(`- **Finished**: ${report.finishedAt}`);
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

  // Sample passing cases
  const passing = report.results.filter((r) => r.passed);
  if (passing.length > 0) {
    lines.push("## Sample Passing Cases");
    lines.push("");
    for (const r of passing.slice(0, 5)) {
      lines.push(`### ${r.caseId} (${r.dimension})`);
      lines.push("");
      const truncated = r.response.length > 300 ? r.response.slice(0, 300) + "..." : r.response;
      lines.push(`**Response**: ${truncated}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
