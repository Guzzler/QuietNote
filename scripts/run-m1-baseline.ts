/**
 * M1 baseline runner (model-quality, 2026-07-14).
 *
 * Runs the M1 conversational-quality instrument headlessly:
 *   1. ECHO_EVAL_CASES — 10 single-turn echo-temptation cases; records
 *      max n-gram overlap + template-smell per case.
 *   2. QUALITY_BAR_SCENARIOS — three 10-turn scenarios via the C1 driver
 *      (strategy `managed` = the REAL app send path, recap + trim), scored
 *      by the quality-bar rubric.
 *
 * Model: same Node path as run-eval.ts — `onnx-community/gemma-4-E2B-it-ONNX`
 * (q4f16, onnxruntime-node CPU), the SAME model Transformers.js serves in the
 * app and the parent of the MediaPipe LiteRT conversion. WebLLM (Gemma 2 2B)
 * and MediaPipe are browser-bound and have no headless path — their baselines
 * require a browser run and are recorded as pending in model-quality.md.
 *
 * Usage:
 *   npm run eval:m1            # full baseline
 *   npm run eval:m1 -- --scenarios-only
 *   npm run eval:m1 -- --echo-only
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { getBaseSystemInstruction } from "../src/prompts/systemPrompts.ts";
import { isBareDeflection, withDeflectionReprompt } from "../src/utils/responseShaping.ts";
import { ECHO_EVAL_CASES } from "../src/utils/echoEvalCases.ts";
import {
  firstSentence,
  maxNgramOverlap,
  scoreNoEcho,
  templateSmellCount,
} from "../src/utils/echoMetric.ts";
import { QUALITY_BAR_SCENARIOS } from "../src/utils/qualityBarScenarios.ts";
import {
  scoreScenario,
  rubricReportToMarkdown,
  type ScenarioRubricResult,
} from "../src/utils/qualityBarRubric.ts";
import { runConversationScript } from "../src/utils/conversationDriver.ts";

const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX"; // mirrors transformersjs-engine.ts:16
const MODEL_LABEL = "Gemma 4 E2B ONNX q4f16 (Node onnxruntime-node CPU)";
// Mirrors generation defaults in transformersjs-engine.ts:123-126
const GEN_DEFAULTS = {
  max_new_tokens: 200,
  temperature: 0.6,
  repetition_penalty: 1.3,
  do_sample: true,
};

const args = process.argv.slice(2);
const RUN_ECHO = !args.includes("--scenarios-only");
const RUN_SCENARIOS = !args.includes("--echo-only");

const __dirname = dirname(fileURLToPath(import.meta.url));
const TODAY = new Date().toISOString().slice(0, 10);
const OUT_DIR = join(__dirname, "..", "docs", "eval-runs", `${TODAY}-m1-baseline`);

async function main() {
  console.log(`[m1] Loading ${MODEL_ID}…`);
  const { AutoTokenizer, AutoModelForCausalLM } = await import("@huggingface/transformers");
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, { dtype: "q4f16" });
  console.log(`[m1] Model loaded.`);

  async function generateOnce(messages: { role: string; content: string }[]): Promise<string> {
    const inputs = (tokenizer as any).apply_chat_template(messages, {
      tokenize: true,
      return_dict: true,
      add_generation_prompt: true,
    });
    const out = await (model as any).generate({ ...inputs, ...GEN_DEFAULTS });
    const inputIdsLen = inputs.input_ids?.dims?.at(-1) ?? 0;
    const outIds: number[][] =
      typeof (out as any).tolist === "function" ? (out as any).tolist() : (out as any);
    const text = (tokenizer as any).decode(outIds[0].slice(inputIdsLen), {
      skip_special_tokens: true,
    });
    return typeof text === "string" ? text.trim() : String(text).trim();
  }

  // App-faithful send path (deflection guard only; the scenarios contain no
  // crisis/medical content, so the referral guard has nothing to fire on).
  async function generate(messages: { role: string; content: string }[]): Promise<string> {
    const first = await generateOnce(messages);
    return isBareDeflection(first)
      ? generateOnce(withDeflectionReprompt(messages))
      : first;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // ── 1. Single-turn echo cases ─────────────────────────────────────────
  if (RUN_ECHO) {
    console.log(`[m1] Echo cases: ${ECHO_EVAL_CASES.length}`);
    const rows: {
      id: string;
      mode: string;
      overlap: number;
      noEcho: number;
      smells: number;
      opening: string;
    }[] = [];
    for (const c of ECHO_EVAL_CASES) {
      const messages = [
        { role: "system", content: getBaseSystemInstruction(c.mode, { morning: false }) },
        { role: "user", content: c.prompt },
      ];
      const reply = await generate(messages);
      const overlap = maxNgramOverlap(c.prompt, reply);
      rows.push({
        id: c.id,
        mode: c.mode,
        overlap,
        noEcho: scoreNoEcho(c.prompt, reply),
        smells: templateSmellCount(reply),
        opening: firstSentence(reply),
      });
      console.log(
        `[m1]   ${c.id} overlap=${overlap.toFixed(2)} noEcho=${rows.at(-1)!.noEcho} smells=${rows.at(-1)!.smells}`
      );
    }
    const lines: string[] = [];
    lines.push(`# M1 Echo Baseline — single-turn cases`);
    lines.push("");
    lines.push(`Model: ${MODEL_LABEL}. Generated ${new Date().toISOString()}.`);
    lines.push("");
    lines.push(`| id | mode | overlap | no-echo (0–2) | template smells | reply opening |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const r of rows) {
      lines.push(
        `| ${r.id} | ${r.mode} | ${r.overlap.toFixed(2)} | ${r.noEcho} | ${r.smells} | ${r.opening.replace(/\|/g, "\\|").slice(0, 100)} |`
      );
    }
    const pass = rows.filter((r) => r.noEcho === 2).length;
    lines.push("");
    lines.push(
      `**Headline: ${pass}/${rows.length} cases open without echo (score 2); ` +
        `mean overlap ${(rows.reduce((a, r) => a + r.overlap, 0) / rows.length).toFixed(2)}.**`
    );
    writeFileSync(join(OUT_DIR, "echo-cases.md"), lines.join("\n"), "utf8");
    writeFileSync(
      join(OUT_DIR, "echo-cases.json"),
      JSON.stringify({ model: MODEL_LABEL, rows }, null, 2),
      "utf8"
    );
    console.log(`[m1] Wrote echo-cases.md (${pass}/${rows.length} no-echo passes)`);
  }

  // ── 2. Three 10-turn quality-bar scenarios ────────────────────────────
  if (RUN_SCENARIOS) {
    const results: ScenarioRubricResult[] = [];
    for (const scenario of QUALITY_BAR_SCENARIOS) {
      console.log(`[m1] Scenario: ${scenario.script.id} (${scenario.script.mode}, 10 turns)`);
      const systemInstruction = getBaseSystemInstruction(scenario.script.mode, {
        morning: false,
      });
      const run = await runConversationScript(scenario.script, {
        systemInstruction,
        generate,
        strategy: "managed", // the real app send path (recap + trim)
      });
      const scored = scoreScenario(scenario, run);
      results.push(scored);
      console.log(
        `[m1]   → ${scored.totalScore}/${scored.maxScore} (${Math.round(scored.percent * 100)}%), ` +
          `zero-critical: [${scored.zeroCriticalTurns.join(", ")}], ` +
          `first trim: ${scored.firstTrimTurnIndex ?? "none"}, pass=${scored.passed}`
      );
      // Full transcript for audit.
      const transcript = run.turns
        .map(
          (t) =>
            `### Turn ${t.turnIndex}\n\n**User**: ${t.user}\n\n**Model**: ${t.response}\n`
        )
        .join("\n");
      writeFileSync(
        join(OUT_DIR, `transcript-${scenario.script.id}.md`),
        `# ${scenario.script.id} transcript (${MODEL_LABEL})\n\n${transcript}`,
        "utf8"
      );
    }
    writeFileSync(
      join(OUT_DIR, "quality-bar-rubric.md"),
      rubricReportToMarkdown(results, MODEL_LABEL),
      "utf8"
    );
    writeFileSync(
      join(OUT_DIR, "quality-bar-rubric.json"),
      JSON.stringify(
        {
          model: MODEL_LABEL,
          results: results.map((r) => ({
            scenarioId: r.scenarioId,
            totalScore: r.totalScore,
            maxScore: r.maxScore,
            percent: r.percent,
            zeroCriticalTurns: r.zeroCriticalTurns,
            firstTrimTurnIndex: r.firstTrimTurnIndex,
            passed: r.passed,
          })),
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(`[m1] Wrote quality-bar-rubric.md — done.`);
  }
}

main().catch((err) => {
  console.error("\n[m1] FATAL:", err);
  process.exit(1);
});
