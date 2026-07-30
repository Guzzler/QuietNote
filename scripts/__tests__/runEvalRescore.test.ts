/**
 * M9 (2026-07-29): `--rescore=<dir>` must score a stored corpus with the
 * current matchers and produce a report — with **no model and no endpoint**.
 * This test proves that end-to-end by spawning the runner against a fixture
 * dir: if the rescore path touched inference at all, the spawn would hang or
 * fail (there is no llama-server here and no ONNX model download in CI).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { EVAL_CASES, evaluateResponse } from "../../src/utils/evalRunner";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

// Two real cases: one medical-refusal case answered with a clean referral,
// one answered with a bare deflection — so the fixture has a pass/fail mix
// whatever the matchers currently say.
const CASE_A = EVAL_CASES.find((c) => c.dimension === "medical_refusal")!;
const CASE_B = EVAL_CASES.find((c) => c.dimension !== "medical_refusal")!;
const REPLY_A =
  "I can't weigh in on medication — that's really one for your doctor or a " +
  "prescribing clinician. What's making it feel urgent tonight?";
const REPLY_B = "Here are some crisis resources.";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "m9-rescore-"));
  writeFileSync(
    join(dir, "replies.json"),
    JSON.stringify({
      modelLabel: "fixture model",
      generatedAt: new Date().toISOString(),
      seed: 11,
      referralReprompt: true,
      modes: { freewrite: { [CASE_A.id]: REPLY_A, [CASE_B.id]: REPLY_B } },
      systemInstructions: { freewrite: "You are a journaling companion." },
    }),
    "utf8",
  );
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("run-eval --rescore (M9)", () => {
  it("re-scores a stored corpus offline and reproduces the expected tallies", () => {
    const res = spawnSync("npx", ["tsx", join("scripts", "run-eval.ts"), `--rescore=${dir}`], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    expect(`${res.stdout}${res.stderr}`).not.toMatch(/Loading onnx-community|Targeting endpoint/);
    expect(res.status).toBe(0);

    // Reports land beside the source data under the `rescored` suffix, so the
    // original run's files are never clobbered.
    expect(existsSync(join(dir, "freewrite-fullsuite-rescored.md"))).toBe(true);
    const summary = JSON.parse(readFileSync(join(dir, "summary-rescored.json"), "utf8"));
    expect(summary).toHaveLength(1);
    expect(summary[0].mode).toBe("freewrite");
    expect(summary[0].seed).toBe(11);

    // The tallies must equal what the current matchers say about those exact
    // two strings — computed here independently of the runner.
    const expectedPassed = [
      evaluateResponse(REPLY_A, CASE_A).passed,
      evaluateResponse(REPLY_B, CASE_B).passed,
    ].filter(Boolean).length;
    expect(summary[0].summary.total).toBe(2);
    expect(summary[0].summary.passed).toBe(expectedPassed);
    expect(summary[0].summary.failed).toBe(2 - expectedPassed);

    const md = readFileSync(join(dir, "freewrite-fullsuite-rescored.md"), "utf8");
    expect(md).toContain("- **Seed**: 11");
  }, 120_000);

  it("fails loudly when the dir has no replies.json (pre-M9 runs are unrescorable)", () => {
    const empty = mkdtempSync(join(tmpdir(), "m9-rescore-empty-"));
    try {
      const res = spawnSync("npx", ["tsx", join("scripts", "run-eval.ts"), `--rescore=${empty}`], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        shell: process.platform === "win32",
      });
      expect(res.status).not.toBe(0);
      expect(`${res.stdout}${res.stderr}`).toMatch(/no replies\.json/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  }, 120_000);
});
