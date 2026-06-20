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
import { CONVERSATION_SCRIPTS } from "../src/utils/conversationScripts.ts";
import {
  runConversationScript,
  scriptReportToMarkdown,
  CONTEXT_STRATEGIES,
  type ScriptResult,
  type ContextStrategy,
} from "../src/utils/conversationDriver.ts";
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
// Track C1/C2: when --scripts is passed, also run CONVERSATION_SCRIPTS
// (multi-turn scripted conversations with REAL accumulated context):
//   npm run eval -- --scripts                      # default strategy: managed
//   npm run eval -- --scripts --strategy=all       # the C2 A/B (all 3 strategies)
//   npm run eval -- --scripts --strategy=raw       # single strategy
// Default is `managed` because that is the real app send path (recap + trim).
const RUN_SCRIPTS = args.includes("--scripts");
// Optional: restrict the scripted run to a single script id (CPU is slow, so a
// bounded live run — e.g. just the boundary-crossing script under all three
// strategies — is often the practical C2 invocation). Comma-separated ids ok.
const scriptIdArg = args.find((a) => a.startsWith("--script="));
const ONLY_SCRIPT_IDS = scriptIdArg
  ? new Set(scriptIdArg.split("=")[1].split(","))
  : null;
const strategyArg = args.find((a) => a.startsWith("--strategy="));
const STRATEGY_SELECTION = strategyArg ? strategyArg.split("=")[1] : "managed";
const RUN_STRATEGIES: ContextStrategy[] =
  STRATEGY_SELECTION === "all"
    ? CONTEXT_STRATEGIES
    : ([STRATEGY_SELECTION] as ContextStrategy[]);
// Validate the selection early so a typo fails loudly rather than silently
// running nothing.
for (const s of RUN_STRATEGIES) {
  if (!CONTEXT_STRATEGIES.includes(s)) {
    console.error(
      `[run-eval] Unknown --strategy=${s}. Valid: ${CONTEXT_STRATEGIES.join(", ")}, all`
    );
    process.exit(1);
  }
}

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

  // Track C1/C2: scripted multi-turn conversations (only when --scripts is
  // passed). C2 runs each script under one or more context strategies (raw,
  // managed [= real app path], managed-norecap) and records trim telemetry.
  const scriptResults: ScriptResult[] = [];
  if (RUN_SCRIPTS) {
    const scriptsToRun = ONLY_SCRIPT_IDS
      ? CONVERSATION_SCRIPTS.filter((s) => ONLY_SCRIPT_IDS.has(s.id))
      : CONVERSATION_SCRIPTS;
    console.log(
      `\n[run-eval] Running ${scriptsToRun.length} conversation script(s) ` +
        `× ${RUN_STRATEGIES.length} strategy(ies) [${RUN_STRATEGIES.join(", ")}]…`
    );
    for (const strategy of RUN_STRATEGIES) {
      for (const script of scriptsToRun) {
        const systemInstruction = getBaseSystemInstruction(script.mode, { morning: false });
        console.log(
          `[run-eval] [${strategy}] script: ${script.id} (${script.mode}, ${script.turns.length} turns)`
        );
        const result = await runConversationScript(script, {
          systemInstruction,
          generate,
          strategy,
        });
        scriptResults.push(result);
        const s = result.summary;
        console.log(
          `[run-eval]   → turns ${s.passedTurns}/${s.scoredTurns}, probes ${s.probesPassed}/${s.probes}, ` +
            `step-coherent ${s.stepCoherent === null ? "n/a" : s.stepCoherent}, ` +
            `first-trim ${s.firstTrimTurnIndex === null ? "none" : `t${s.firstTrimTurnIndex}`}, ` +
            `after-trim probes ${s.probesPassedAfterTrim}/${s.probesAfterTrim}`
        );
      }
    }
    const scriptsPath = join(OUT_DIR, "conversation-scripts.md");
    writeFileSync(scriptsPath, scriptReportToMarkdown(scriptResults), "utf8");
    console.log(`[run-eval] Wrote ${scriptsPath}`);
  }

  // Write a combined machine summary (JSON) the critic step can read.
  // Default shape is the historical ARRAY of per-mode reports — kept
  // byte-identical so the existing critic loop is undisturbed. Only when
  // --scripts is passed (C2's live run) do we wrap it to attach a `scripts`
  // block alongside the modes.
  const modeSummaries = allReports.map(({ mode, report }) => ({
    mode,
    modelLabel: report.modelLabel,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    summary: report.summary,
  }));
  const summary: unknown = RUN_SCRIPTS
    ? {
        modes: modeSummaries,
        scripts: scriptResults.map((r) => ({
          scriptId: r.scriptId,
          mode: r.mode,
          strategy: r.strategy,
          summary: r.summary,
        })),
      }
    : modeSummaries;
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
