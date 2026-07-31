/**
 * M12 (2026-07-30): a seeded run must also disable llama-server's prefix
 * KV-cache reuse, because M9 measured that `seed` alone does not make a suite
 * read replayable (same seed 11, ±2 per floor). The pairing is the whole point
 * of the increment, so it is asserted end-to-end on the real request body the
 * script sends — not on the options object, which a future refactor could
 * rewire without anyone noticing.
 *
 * The stub endpoint is a plain node http server on an ephemeral port speaking
 * the OpenAI chat-completions shape, so no model and no llama-server are
 * involved. NOTE: the child must be spawned ASYNCHRONOUSLY — `spawnSync` blocks
 * this process's event loop, so the in-process stub could never answer and the
 * run would deadlock.
 */
import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { rmSync } from "node:fs";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const SCRIPT = join("scripts", "run-eval.ts");

/** Starts a stub /v1/chat/completions server; resolves with its port + captured bodies. */
async function startStub(): Promise<{
  port: number;
  bodies: Record<string, unknown>[];
  close: () => Promise<void>;
  server: Server;
}> {
  const bodies: Record<string, unknown>[] = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        bodies.push(JSON.parse(raw));
      } catch {
        bodies.push({ __unparseable: raw });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [{ message: { content: "That sounds heavy. What made today feel that way?" } }],
        })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return {
    port,
    bodies,
    server,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function runEval(args: string[]): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", SCRIPT, ...args], {
      cwd: REPO_ROOT,
      shell: process.platform === "win32",
    });
    let output = "";
    child.stdout.on("data", (c) => (output += c));
    child.stderr.on("data", (c) => (output += c));
    child.on("close", (status) => resolve({ status, output }));
  });
}

describe("run-eval seed ⇒ cache_prompt pairing (M12)", () => {
  it("a seeded endpoint run sends cache_prompt:false alongside the seed on every request", async () => {
    const stub = await startStub();
    // --outdir is a NAME under docs/eval-runs/, not a path; removed in finally.
    const outdir = "zz-m12-seeded-probe";
    try {
      const res = await runEval([
        `--endpoint=http://127.0.0.1:${stub.port}`,
        "--seed=11",
        "--mode=freewrite",
        "--limit=2",
        `--outdir=${outdir}`,
      ]);
      expect(res.status).toBe(0);
      expect(stub.bodies.length).toBeGreaterThan(0);
      for (const body of stub.bodies) {
        expect(body.seed).toBe(11);
        expect("cache_prompt" in body).toBe(true);
        expect(body.cache_prompt).toBe(false);
      }
    } finally {
      await stub.close();
      rmSync(join(REPO_ROOT, "docs", "eval-runs", outdir), {
        recursive: true,
        force: true,
      });
    }
  }, 180_000);

  it("an UNSEEDED endpoint run sends neither key — every historical run stays byte-identical", async () => {
    const stub = await startStub();
    const outdir = "zz-m12-unseeded-probe";
    try {
      const res = await runEval([
        `--endpoint=http://127.0.0.1:${stub.port}`,
        "--mode=freewrite",
        "--limit=2",
        `--outdir=${outdir}`,
      ]);
      expect(res.status).toBe(0);
      expect(stub.bodies.length).toBeGreaterThan(0);
      for (const body of stub.bodies) {
        expect("seed" in body).toBe(false);
        expect("cache_prompt" in body).toBe(false);
      }
    } finally {
      await stub.close();
      rmSync(join(REPO_ROOT, "docs", "eval-runs", outdir), {
        recursive: true,
        force: true,
      });
    }
  }, 180_000);
});
