/**
 * M9 (2026-07-29): the `--seed` flag must be *impossible* to use in a way
 * that produces an artifact claiming a seed the sampler never saw.
 *
 * The guard lives in `scripts/run-eval.ts`'s top-level arg block, which runs
 * before `main()`, so spawning the script is cheap: it exits during parsing
 * without loading a model or touching the network.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const SCRIPT = join("scripts", "run-eval.ts");

function runEval(...args: string[]) {
  return spawnSync("npx", ["tsx", SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

describe("run-eval --seed guard (M9)", () => {
  it("exits non-zero with an explanatory message when --seed is passed without --endpoint", () => {
    const res = runEval("--seed=11", "--limit=1");
    expect(res.status).not.toBe(0);
    expect(`${res.stderr}${res.stdout}`).toMatch(/--seed requires --endpoint/);
  }, 60_000);

  it("rejects a non-integer seed", () => {
    const res = runEval("--seed=abc", "--endpoint=http://127.0.0.1:9", "--limit=1");
    expect(res.status).not.toBe(0);
    expect(`${res.stderr}${res.stdout}`).toMatch(/--seed must be an integer/);
  }, 60_000);
});
