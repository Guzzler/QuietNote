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
import {
  shouldAttemptReferralReprompt,
  withReferralReprompt,
} from "../src/utils/referralReprompt.ts";
import { detectCrisis } from "../src/utils/crisisDetection.ts";
import { CONVERSATION_SCRIPTS } from "../src/utils/conversationScripts.ts";
import {
  runConversationScript,
  scriptReportToMarkdown,
  CONTEXT_STRATEGIES,
  type ScriptResult,
  type ContextStrategy,
} from "../src/utils/conversationDriver.ts";
import {
  TOOL_GRAMMAR_INSTRUCTION,
  TOOL_REPROMPT_INSTRUCTION,
  parseToolCalls,
} from "../src/utils/toolCalls.ts";
import {
  TOOL_EVAL_CASES,
  scoreToolCase,
  type ToolCaseScore,
} from "../src/utils/toolCallEval.ts";
import type { JournalingMode } from "../src/components/JournalingModeSelector.tsx";
import {
  resolveOutDirName,
  withOutfileSuffix,
  modeReportFilename,
  summaryFilename,
} from "../src/utils/evalOutputPaths.ts";

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
// Track D1: when --tools is passed, run the tool-call capability spike
// (TOOL_EVAL_CASES) — single-turn cases measuring valid-call rate, argument
// accuracy, and false-call rate on ordinary journaling turns:
//   npm run eval:tools
// Augmentation is string concatenation at runtime here in the runner; the
// freeze-gated systemPrompts.ts stays byte-identical (the C1 precedent).
const RUN_TOOLS = args.includes("--tools");
// When running the tool spike on its own, skip the (expensive) per-mode base
// suite — the spike is its own measurement. `--scripts --tools` or an explicit
// `--base` still runs the base loop.
const RUN_BASE = !RUN_TOOLS || RUN_SCRIPTS || args.includes("--base");
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

// Output hygiene (Day 32): the UTC-date default dir plus fixed per-mode
// filenames clobbered raw data on runs that crossed UTC midnight and on
// multi-pass same-mode runs (Day-29, Day-31 NOTEs). `--outdir=<name>` pins
// the directory under docs/eval-runs/; `--outfile-suffix=<suffix>` makes
// each pass's files unique (gratitude-pass1.md, summary-pass1.json). Both
// default to the historical behavior when absent.
// Referral-omission guard (Day 33): --referral-reprompt mirrors the app's new
// send-path mechanism in the eval `generate` closure. Default OFF so every
// historical number (and the cadence-due critic read) stays comparable.
const REFERRAL_REPROMPT = args.includes("--referral-reprompt");
let referralRepromptFires = 0;

// M4a (2026-07-18): --endpoint=<url> targets an OpenAI-compatible
// /v1/chat/completions server (llama-server for the GGUF fine-tune proxy)
// instead of loading the local ONNX model. Same guards, cases, and floors.
const endpointArg = args.find((a) => a.startsWith("--endpoint="));
const ENDPOINT = endpointArg ? endpointArg.split("=")[1] : null;
const modelLabelArg = args.find((a) => a.startsWith("--model-label="));
const MODEL_LABEL =
  modelLabelArg?.split("=").slice(1).join("=") ??
  (ENDPOINT ? `OpenAI-compatible endpoint (${ENDPOINT})` : "Gemma 4 E2B (Node onnxruntime-node)");

// M9 (2026-07-29): --seed=<n> pins llama-server's sampler so a run is
// replayable. Endpoint path ONLY — the local ONNX path
// (@huggingface/transformers `generate`) exposes no seed knob, so passing
// --seed without --endpoint must fail loudly rather than silently produce an
// unseeded run that claims a seed in its artifacts.
const seedArg = args.find((a) => a.startsWith("--seed="));
let SEED: number | undefined;
if (seedArg) {
  const raw = seedArg.split("=")[1];
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    console.error(`[run-eval] --seed must be an integer, got "${raw}".`);
    process.exit(1);
  }
  if (!ENDPOINT) {
    console.error(
      "[run-eval] --seed requires --endpoint=<url>: the local ONNX generate() " +
        "path has no seed knob, so a seeded run is impossible there. Re-run " +
        "with --endpoint, or drop --seed."
    );
    process.exit(1);
  }
  SEED = parsed;
}

const outdirArg = args.find((a) => a.startsWith("--outdir="));
const OUTDIR_NAME = outdirArg ? outdirArg.split("=")[1] : undefined;
const suffixArg = args.find((a) => a.startsWith("--outfile-suffix="));
const OUTFILE_SUFFIX = suffixArg ? suffixArg.split("=")[1] : undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
const TODAY = new Date().toISOString().slice(0, 10);
const OUT_DIR = join(REPO_ROOT, "docs", "eval-runs", resolveOutDirName(OUTDIR_NAME, TODAY));

async function main() {
  let generateOnce: (messages: { role: string; content: string }[]) => Promise<string>;
  if (ENDPOINT) {
    console.log(
      `[run-eval] Targeting endpoint ${ENDPOINT} (${MODEL_LABEL})` +
        ` seed=${SEED === undefined ? "unset" : SEED}`
    );
    const { createEndpointGenerateOnce } = await import("../src/utils/endpointGenerate.ts");
    generateOnce = createEndpointGenerateOnce(ENDPOINT, {
      maxTokens: GEN_DEFAULTS.max_new_tokens,
      temperature: GEN_DEFAULTS.temperature,
      repetitionPenalty: GEN_DEFAULTS.repetition_penalty,
      seed: SEED,
    });
  } else {
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

    generateOnce = async (messages) => {
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
    };
  }

  // Build a stateless `generate` matching evalDriver's signature.
  // Mirrors the app's send path (src/App.tsx): if the first pass is a bare
  // crisis-resource deflection, issue ONE re-generation with the shaping
  // instruction and take the second response unconditionally (mechanism B).
  async function generate(messages: { role: string; content: string }[]): Promise<string> {
    const first = await generateOnce(messages);
    let deflectionFired = false;
    let response = first;
    if (isBareDeflection(first)) {
      deflectionFired = true;
      response = await generateOnce(withDeflectionReprompt(messages));
    }
    // Referral-omission guard (Day 33) — byte-faithful to the App.tsx send
    // paths: crisis-suppressed, skipped when the deflection guard already
    // re-generated, one extra generation per turn max. Only active with
    // --referral-reprompt (default OFF for comparability).
    if (REFERRAL_REPROMPT) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const userText = lastUser?.content ?? "";
      if (
        shouldAttemptReferralReprompt(userText, response, {
          deflectionFired,
          crisisDetected: detectCrisis(userText).isCrisis,
        })
      ) {
        referralRepromptFires++;
        console.log(
          `\n[run-eval] [ReferralReprompt] fire #${referralRepromptFires} on user turn: ` +
            `"${userText.slice(0, 60)}${userText.length > 60 ? "…" : ""}"`
        );
        response = await generateOnce(withReferralReprompt(messages));
      }
    }
    return response;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const allReports: { mode: JournalingMode; report: EvalRunReport }[] = [];

  for (const mode of RUN_BASE ? RUN_MODES : []) {
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
        { systemInstruction, generate, dimensions, onProgress: progress(mode), seed: SEED },
        MODEL_LABEL
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
    const scriptsPath = join(OUT_DIR, withOutfileSuffix("conversation-scripts.md", OUTFILE_SUFFIX));
    writeFileSync(scriptsPath, scriptReportToMarkdown(scriptResults), "utf8");
    console.log(`[run-eval] Wrote ${scriptsPath}`);
  }

  // Track D1: tool-call capability spike (only when --tools is passed).
  // For each case: build messages = base system instruction + the grammar
  // beat (runtime string concat), generate, parse, score. On expectCall cases
  // that produced an invalid-but-no-valid call, append TOOL_REPROMPT_INSTRUCTION
  // and regenerate ONCE (mirrors the responseShaping retry shape).
  const toolRecords: ToolCaseRecord[] = [];
  if (RUN_TOOLS) {
    console.log(`\n[run-eval] Running ${TOOL_EVAL_CASES.length} tool-call spike case(s)…`);
    for (const c of TOOL_EVAL_CASES) {
      const systemContent =
        getBaseSystemInstruction(c.mode, { morning: false }) + "\n\n" + TOOL_GRAMMAR_INSTRUCTION;
      const messages = [
        { role: "system", content: systemContent },
        { role: "user", content: c.userMessage },
      ];
      let response = await generateOnce(messages);
      let parse = parseToolCalls(response);
      let retryUsed = false;
      // Retry rule (the gate counts this): only for tool-warranted cases that
      // produced a malformed call (invalid present, no valid).
      if (c.expectCall && parse.invalidCalls.length > 0 && parse.validCalls.length === 0) {
        retryUsed = true;
        const retryMessages = [
          ...messages,
          { role: "assistant", content: response },
          { role: "user", content: TOOL_REPROMPT_INSTRUCTION },
        ];
        response = await generateOnce(retryMessages);
        parse = parseToolCalls(response);
      }
      const score = scoreToolCase(c, parse);
      const toolEmitted = parse.calls.length > 0 ? parse.calls[0].name : null;
      toolRecords.push({
        id: c.id,
        mode: c.mode,
        expectCall: c.expectCall,
        expectedTool: c.expectedTool ?? null,
        toolEmitted,
        score,
        retryUsed,
        strippedText: parse.strippedText,
        rawResponse: response,
      });
      console.log(
        `[run-eval]   ${c.id} (${c.mode}) expect=${c.expectCall ? "CALL" : "silent"} ` +
          `→ emitted=${toolEmitted ?? "none"} valid=${score.validCallMade} ` +
          `arg=${score.argAccurate === null ? "n/a" : score.argAccurate} ` +
          `false=${score.falseCall}${retryUsed ? " [retry]" : ""}`
      );
    }
    const toolsPath = join(OUT_DIR, withOutfileSuffix("D1-tool-spike.md", OUTFILE_SUFFIX));
    writeFileSync(toolsPath, toolRecordsToMarkdown(toolRecords), "utf8");
    console.log(`[run-eval] Wrote ${toolsPath}`);
  }

  // Write a combined machine summary (JSON) the critic step can read.
  // Default shape is the historical ARRAY of per-mode reports — kept
  // byte-identical so the existing critic loop is undisturbed. Only when
  // --scripts and/or --tools is passed do we wrap it to attach extra blocks
  // alongside the modes.
  const modeSummaries = allReports.map(({ mode, report }) => ({
    mode,
    modelLabel: report.modelLabel,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    // M9: the seed key appears only on seeded runs, so unseeded summary.json
    // files keep the historical shape exactly.
    ...(report.seed !== undefined ? { seed: report.seed } : {}),
    summary: report.summary,
  }));
  let summary: unknown = modeSummaries;
  if (RUN_SCRIPTS || RUN_TOOLS) {
    const wrapped: Record<string, unknown> = { modes: modeSummaries };
    if (RUN_SCRIPTS) {
      wrapped.scripts = scriptResults.map((r) => ({
        scriptId: r.scriptId,
        mode: r.mode,
        strategy: r.strategy,
        summary: r.summary,
      }));
    }
    if (RUN_TOOLS) {
      wrapped.tools = toolSummary(toolRecords);
    }
    summary = wrapped;
  }
  const summaryPath = join(OUT_DIR, summaryFilename(OUTFILE_SUFFIX));
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  if (REFERRAL_REPROMPT) {
    console.log(`[run-eval] [ReferralReprompt] total fires this run: ${referralRepromptFires}`);
  }
  console.log(`\n[run-eval] Wrote ${summaryPath} — done.`);
}

// Track D1: per-case record + report writers.
interface ToolCaseRecord {
  id: string;
  mode: JournalingMode;
  expectCall: boolean;
  expectedTool: string | null;
  toolEmitted: string | null;
  score: ToolCaseScore;
  retryUsed: boolean;
  strippedText: string;
  rawResponse: string;
}

function toolSummary(records: ToolCaseRecord[]) {
  const warranted = records.filter((r) => r.expectCall);
  const ordinary = records.filter((r) => !r.expectCall);
  const validCalls = warranted.filter((r) => r.score.validCallMade);
  const argAccurate = validCalls.filter((r) => r.score.argAccurate === true);
  const falseCalls = ordinary.filter((r) => r.score.falseCall);
  const retriesUsed = warranted.filter((r) => r.retryUsed);
  return {
    warrantedTotal: warranted.length,
    validCalls: validCalls.length,
    validCallRate: warranted.length ? validCalls.length / warranted.length : 0,
    argAccurate: argAccurate.length,
    argAccuracyRate: validCalls.length ? argAccurate.length / validCalls.length : null,
    ordinaryTotal: ordinary.length,
    falseCalls: falseCalls.length,
    falseCallRate: ordinary.length ? falseCalls.length / ordinary.length : 0,
    retriesUsed: retriesUsed.length,
  };
}

function toolRecordsToMarkdown(records: ToolCaseRecord[]): string {
  const s = toolSummary(records);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const lines: string[] = [];
  lines.push(`# D1 Tool-Call Spike — per-case results`);
  lines.push("");
  lines.push(`Model: ${MODEL_LABEL}. Generated ${new Date().toISOString()}.`);
  lines.push("");
  lines.push(`## Headline rates`);
  lines.push("");
  lines.push(`- **Valid-call rate (incl. retry):** ${s.validCalls}/${s.warrantedTotal} = ${pct(s.validCallRate)}`);
  lines.push(
    `- **Argument accuracy:** ${s.argAccurate}/${s.validCalls} = ${
      s.argAccuracyRate === null ? "n/a" : pct(s.argAccuracyRate)
    }`
  );
  lines.push(`- **False-call rate:** ${s.falseCalls}/${s.ordinaryTotal} = ${pct(s.falseCallRate)}`);
  lines.push(`- Retries used: ${s.retriesUsed}/${s.warrantedTotal} warranted cases`);
  lines.push("");
  lines.push(`## Per-case table`);
  lines.push("");
  lines.push(`| id | mode | expect | tool emitted | valid? | arg-acc? | false? | retry? |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  for (const r of records) {
    lines.push(
      `| ${r.id} | ${r.mode} | ${r.expectCall ? "CALL" : "silent"} | ${r.toolEmitted ?? "—"} | ` +
        `${r.expectCall ? (r.score.validCallMade ? "✓" : "✗") : "—"} | ` +
        `${r.score.argAccurate === null ? "—" : r.score.argAccurate ? "✓" : "✗"} | ` +
        `${r.expectCall ? "—" : r.score.falseCall ? "✗ FALSE" : "✓"} | ` +
        `${r.retryUsed ? "yes" : "—"} |`
    );
  }
  lines.push("");
  // Quote every false call in full — these are the most important bodies.
  const falseCalls = records.filter((r) => !r.expectCall && r.score.falseCall);
  lines.push(`## False calls (${falseCalls.length})`);
  lines.push("");
  if (falseCalls.length === 0) {
    lines.push(`_None — the model stayed silent on every ordinary journaling turn._`);
  } else {
    for (const r of falseCalls) {
      lines.push(`### ${r.id} (${r.mode})`);
      lines.push("");
      lines.push("```");
      lines.push(r.rawResponse);
      lines.push("```");
      lines.push("");
    }
  }
  // Full raw bodies for the warranted cases (so arg accuracy is auditable).
  lines.push(`## Warranted-case raw responses`);
  lines.push("");
  for (const r of records.filter((x) => x.expectCall)) {
    lines.push(`### ${r.id} (${r.mode}) — expected ${r.expectedTool}`);
    lines.push("");
    lines.push("```");
    lines.push(r.rawResponse);
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

function progress(mode: JournalingMode) {
  return (done: number, total: number, last: { caseId: string; passed: boolean }) => {
    process.stdout.write(
      `[${mode}] ${done}/${total}  ${last.passed ? "PASS" : "FAIL"} ${last.caseId}                \r`
    );
  };
}

function writeMarkdown(mode: JournalingMode, report: EvalRunReport) {
  const path = join(OUT_DIR, modeReportFilename(mode, OUTFILE_SUFFIX));
  writeFileSync(path, reportToMarkdown(report), "utf8");
  console.log(`\n[run-eval] Wrote ${path} — ${report.summary.passed}/${report.summary.total} pass`);
}

main().catch((err) => {
  console.error("\n[run-eval] FATAL:", err);
  process.exit(1);
});
