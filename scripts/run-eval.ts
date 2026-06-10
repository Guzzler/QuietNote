/**
 * Node-executable eval runner — built 2026-06-01 to unblock the headless
 * critic loop.
 *
 * Why this exists
 * ---------------
 * The 3 inference backends in the app (WebLLM, MediaPipe, Transformers.js)
 * are all browser-bound (WebGPU/WASM). The scheduled execution slot is
 * headless, so for 3 days the EVAL critic loop has been unable to produce
 * real model output autonomously. This runner uses the SAME Transformers.js
 * library and SAME model (`onnx-community/gemma-4-E2B-it-ONNX`) as
 * `src/inference/transformersjs-engine.ts`, but talks to it from Node via
 * `onnxruntime-node` so the loop no longer requires a browser.
 *
 * It deliberately reuses the platform-agnostic core:
 *   - `runEvalSuite` from `src/utils/evalDriver.ts`
 *   - `EVAL_CASES` / `evaluateResponse` from `src/utils/evalRunner.ts`
 *   - `getBaseSystemInstruction` from `src/prompts/systemPrompts.ts`
 * No new cases or dimensions added today (per 2026-06-01 plan's harness freeze).
 *
 * Generation parameters mirror `src/inference/transformersjs-engine.ts:63,121-128`
 * so 2026-06-01 numbers are directly comparable to 2026-05-28 (Day 1).
 *
 * Run with `tsx`:
 *   npm run eval:smoke   # 5-case sanity check
 *   npm run eval         # full per-mode suite
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runEvalSuite, reportToMarkdown, type EvalRunReport } from "../src/utils/evalDriver.ts";
import { EVAL_CASES, type EvalDimension } from "../src/utils/evalRunner.ts";
import { getBaseSystemInstruction } from "../src/prompts/systemPrompts.ts";
import { isBareDeflection, withDeflectionReprompt } from "../src/utils/responseShaping.ts";
import type { JournalingMode } from "../src/components/JournalingModeSelector.tsx";

const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX"; // mirrors transformersjs-engine.ts:16
// Mirrors generation defaults in transformersjs-engine.ts:123-126
const GEN_DEFAULTS = {
  max_new_tokens: 200,
  temperature: 0.6,
  repetition_penalty: 1.3,
  do_sample: true,
};

const MODES: JournalingMode[] = ["freewrite", "gratitude", "checkin", "thoughtrecord"];

// Parse args
const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;
const perDimArg = args.find((a) => a.startsWith("--per-dim="));
const PER_DIM = perDimArg ? parseInt(perDimArg.split("=")[1], 10) : undefined;
const dimsArg = args.find((a) => a.startsWith("--dimensions="));
const FORCED_DIMENSIONS = dimsArg
  ? (dimsArg.split("=")[1].split(",") as EvalDimension[])
  : undefined;
const onlyMode = args.find((a) => a.startsWith("--mode="));
const RUN_MODES: JournalingMode[] = onlyMode
  ? [onlyMode.split("=")[1] as JournalingMode]
  : MODES;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
const TODAY = new Date().toISOString().slice(0, 10);
const OUT_DIR = join(REPO_ROOT, "docs", "eval-runs", TODAY);

async function main() {
  console.log(`[run-eval] Loading ${MODEL_ID} via @huggingface/transformers (Node)…`);
  const { AutoTokenizer, AutoModelForCausalLM } = await import("@huggingface/transformers");

  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  console.log(`[run-eval] Tokenizer loaded.`);

  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "q4f16", // mirrors transformersjs-engine.ts:64
    // No `device` set — Node falls back to onnxruntime-node CPU automatically
    progress_callback: (event: { status?: string; loaded?: number; total?: number }) => {
      if (event.status === "progress" && event.total) {
        const pct = Math.round(((event.loaded ?? 0) / event.total) * 100);
        if (pct % 20 === 0) {
          process.stdout.write(`[run-eval] download ${pct}%\r`);
        }
      }
    },
  });
  console.log(`\n[run-eval] Model loaded — ready to generate.`);

  // Build a stateless `generate` matching evalDriver's signature.
  // Mirrors the app's send path (src/App.tsx): if the first pass is a bare
  // crisis-resource deflection, issue ONE re-generation with the shaping
  // instruction and take the second response unconditionally (mechanism B).
  async function generate(messages: { role: string; content: string }[]): Promise<string> {
    const first = await generateOnce(messages);
    if (!isBareDeflection(first)) return first;
    return generateOnce(withDeflectionReprompt(messages));
  }

  async function generateOnce(messages: { role: string; content: string }[]): Promise<string> {
    const inputs = (tokenizer as any).apply_chat_template(messages, {
      tokenize: true,
      return_dict: true,
      add_generation_prompt: true,
    });
    const out = await (model as any).generate({
      ...inputs,
      ...GEN_DEFAULTS,
    });
    // `out` is a Tensor of shape [batch, seq]. Convert to a JS array, then
    // slice off the prompt tokens and decode just the generated portion.
    const inputIdsLen = inputs.input_ids?.dims?.at(-1) ?? 0;
    const outIds: number[][] =
      typeof (out as any).tolist === "function" ? (out as any).tolist() : (out as any);
    const generated = outIds[0].slice(inputIdsLen);
    const text = (tokenizer as any).decode(generated, { skip_special_tokens: true });
    return typeof text === "string" ? text.trim() : String(text).trim();
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const allReports: { mode: JournalingMode; report: EvalRunReport }[] = [];

  for (const mode of RUN_MODES) {
    const systemInstruction = getBaseSystemInstruction(mode, { morning: false });

    console.log(`\n[run-eval] Mode: ${mode} (${EVAL_CASES.length} cases available)`);

    // Apply LIMIT by truncating EVAL_CASES via a custom dimension filter.
    // Driver doesn't expose per-case limit, so we monkey-patch by filtering
    // EVAL_CASES in-place via dimensions if LIMIT < total — simpler: build
    // a one-off driver call with the dimensions arg and let it run.
    const dimensions = FORCED_DIMENSIONS;

    // Sampling strategy:
    //   --per-dim=N  → take the first N cases per dimension (best coverage)
    //   --limit=N    → take the first N cases overall (smoke)
    //   neither      → run all cases
    const originalCases = [...EVAL_CASES];
    let sampled: typeof originalCases | null = null;
    if (PER_DIM && PER_DIM > 0) {
      const byDim = new Map<string, typeof originalCases>();
      for (const c of originalCases) {
        if (!byDim.has(c.dimension)) byDim.set(c.dimension, []);
        byDim.get(c.dimension)!.push(c);
      }
      sampled = [];
      for (const [, cs] of byDim) sampled.push(...cs.slice(0, PER_DIM));
    } else if (LIMIT && LIMIT > 0 && LIMIT < originalCases.length) {
      sampled = originalCases.slice(0, LIMIT);
    }

    if (sampled) {
      (EVAL_CASES as unknown as any[]).length = 0;
      (EVAL_CASES as unknown as any[]).push(...sampled);
    }
    try {
      const report = await runEvalSuite(
        { systemInstruction, generate, dimensions, onProgress: progress(mode) },
        `Gemma 4 E2B (Node onnxruntime-node)`
      );
      writeMarkdown(mode, report);
      allReports.push({ mode, report });
    } finally {
      if (sampled) {
        (EVAL_CASES as unknown as any[]).length = 0;
        (EVAL_CASES as unknown as any[]).push(...originalCases);
      }
    }
  }

  // Write a combined machine summary (JSON) the critic step can read.
  const summary = allReports.map(({ mode, report }) => ({
    mode,
    modelLabel: report.modelLabel,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    summary: report.summary,
  }));
  writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(`\n[run-eval] Wrote summary.json — done.`);
}

function progress(mode: JournalingMode) {
  return (done: number, total: number, last: { caseId: string; passed: boolean }) => {
    process.stdout.write(
      `[${mode}] ${done}/${total}  ${last.passed ? "PASS" : "FAIL"} ${last.caseId}                \r`
    );
  };
}

function writeMarkdown(mode: JournalingMode, report: EvalRunReport) {
  const fname = mode === "freewrite" ? "freewrite-fullsuite.md" : `${mode}.md`;
  const path = join(OUT_DIR, fname);
  writeFileSync(path, reportToMarkdown(report), "utf8");
  console.log(`\n[run-eval] Wrote ${path} — ${report.summary.passed}/${report.summary.total} pass`);
}

main().catch((err) => {
  console.error("\n[run-eval] FATAL:", err);
  process.exit(1);
});
