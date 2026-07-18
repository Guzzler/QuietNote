/**
 * M2c loop-as-teacher workflow (model-quality, 2026-07-16 — Sharang's
 * interactive decision: the loop itself authors the dataset on the Claude
 * Code subscription; no ANTHROPIC_API_KEY, no API spend).
 *
 * The deck of M2_TARGET_COUNT scenario cards is fixed (count + seed), so
 * batches authored across many runs always fulfill the same cards. Every
 * authored dialogue passes the SAME DATASET.md §5 mechanical filters as any
 * other teacher would — the loop gets no exemption.
 *
 * Per-run protocol:
 *   1. npx tsx scripts/m2-loop-teacher.ts status
 *   2. npx tsx scripts/m2-loop-teacher.ts cards --count 25
 *        -> writes datasets/m2-work/pending-cards.json (cards + prompts)
 *   3. The loop AUTHORS dialogues for those cards into a batch file:
 *        [{"cardId": "fw-0001", "turns": [{"role": "user", ...}, ...]}, ...]
 *   4. npx tsx scripts/m2-loop-teacher.ts ingest <batch.json>
 *        -> filters everything; accepted records append to the dataset,
 *           rejects go to datasets/m2-work/rejects.jsonl with reasons;
 *           the loop rewrites rejects and re-ingests.
 *   5. npx tsx scripts/m2-loop-teacher.ts sample --count 20
 *        -> stratified review sample (markdown) for Sharang's tone veto (§6).
 *
 * API-teacher modes (need ANTHROPIC_API_KEY in .env.local or the env):
 *   - api --count N --model <id>      live calls, immediate results, full price
 *   - batch --count N --model <id>    Messages Batches API — 50% off, ~up to
 *                                      1hr latency, one attempt per card (a
 *                                      follow-up batch/api run retries any
 *                                      still-pending cards)
 *   - compare --count N --models a,b  side-by-side model comparison on the
 *                                      SAME cards, single attempt, NOT
 *                                      ingested — a decision aid, not a
 *                                      dataset contribution
 *
 * The dataset file (datasets/quietnote-m2-v1.jsonl) is git-ignored — the
 * repo never carries the full set (§6); it ships to HF under Sharangp when
 * complete.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildM2Deck,
  interleaveDeck,
  ingestBatch,
  renderTeacherPrompt,
  parseTeacherReply,
  runFilters,
  estimateMaxTokens,
  M2_TARGET_COUNT,
  type AuthoredDialogue,
  type DatasetRecord,
  type ScenarioCard,
  type DialogueTurn,
} from "../src/utils/m2DatasetGenerator.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET_PATH = join(ROOT, "datasets", "quietnote-m2-v1.jsonl");
const WORK_DIR = join(ROOT, "datasets", "m2-work");
const TEACHER_LABEL = "claude (loop-as-teacher, Claude Code session)";

const [command, ...rest] = process.argv.slice(2);

function flag(name: string, fallback: string): string {
  const eq = rest.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = rest.indexOf(`--${name}`);
  if (idx !== -1 && rest[idx + 1] && !rest[idx + 1].startsWith("--")) return rest[idx + 1];
  return fallback;
}

function loadRecords(): DatasetRecord[] {
  if (!existsSync(DATASET_PATH)) return [];
  return readFileSync(DATASET_PATH, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DatasetRecord);
}

const deck = interleaveDeck(buildM2Deck());
const records = loadRecords();
const doneIds = new Set(records.map((r) => r.id));

function printStatus() {
  // Reload from disk so status is fresh even right after an ingest append.
  const current = loadRecords();
  const currentIds = new Set(current.map((r) => r.id));
  const perMode = (list: { mode: string }[]) =>
    list.reduce<Record<string, number>>((acc, r) => ((acc[r.mode] = (acc[r.mode] ?? 0) + 1), acc), {});
  console.log(`Dataset: ${current.length}/${M2_TARGET_COUNT} accepted records`);
  console.log(`  by mode (done):   ${JSON.stringify(perMode(current))}`);
  console.log(`  by mode (target): ${JSON.stringify(perMode(deck))}`);
  const nextCards = deck.filter((c) => !currentIds.has(c.id)).slice(0, 5);
  console.log(`  next cards: ${nextCards.map((c) => c.id).join(", ")}${nextCards.length ? " ..." : " (deck complete)"}`);
}

/** Read ANTHROPIC_API_KEY from env or .env.local — never printed. */
function loadApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envPath = join(ROOT, ".env.local");
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf-8")
      .split("\n")
      .find((l) => l.startsWith("ANTHROPIC_API_KEY="));
    if (line) return line.slice("ANTHROPIC_API_KEY=".length).trim();
  }
  console.error("No ANTHROPIC_API_KEY in the environment or .env.local.");
  process.exit(1);
}

const SYSTEM_MSG = "You write high-quality synthetic training dialogues exactly to spec and output only JSON.";

/** One generation attempt against a card; returns turns or throws with a message. */
async function generateOne(
  client: import("@anthropic-ai/sdk").default,
  card: ScenarioCard,
  model: string,
  retryNote: string,
): Promise<DialogueTurn[]> {
  const response = await client.messages.create({
    model,
    max_tokens: estimateMaxTokens(card),
    system: SYSTEM_MSG,
    messages: [{ role: "user", content: renderTeacherPrompt(card) + retryNote }],
  });
  const text = response.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseTeacherReply(text);
}

/**
 * `api` mode: the API teacher fulfills the SAME fixed deck as loop-authored
 * batches (never the standalone script's own sampling — ids must not
 * collide), through the same ingest filters, with filter reasons fed back
 * into retries. Live calls (immediate results) — costs the full per-token
 * rate; use `batch` mode for large volume (50% off via the Batches API).
 *
 * CONCURRENCY is deliberately low + `maxRetries` raised: a 2026-07-16 M2c
 * run at concurrency 4 burned 18/50 attempts on transient 529 "Overloaded"
 * errors, none of which produced a dialogue to judge — pure waste.
 */
async function runApiBatch(count: number, model: string): Promise<void> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: loadApiKey(), maxRetries: 5 });
  const pending = deck.filter((c) => !doneIds.has(c.id)).slice(0, count);
  console.log(`API batch (live): ${pending.length} cards via ${model}...`);

  const accepted: DatasetRecord[] = [];
  const rejects: { cardId: string; attempt: number; reasons: string[] }[] = [];
  const failed: string[] = [];
  const CONCURRENCY = 2;
  const MAX_ATTEMPTS = 3;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const group = pending.slice(i, i + CONCURRENCY);
    await Promise.all(
      group.map(async (card) => {
        let lastReasons: string[] = [];
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          try {
            const retryNote =
              attempt > 0
                ? `\n\nAttempt ${attempt + 1}: the previous candidate FAILED these mechanical filters — fix every one:\n${lastReasons.map((r) => `- ${r}`).join("\n")}`
                : "";
            const turns = await generateOne(client, card, model, retryNote);
            const reasons = runFilters(turns, card);
            if (reasons.length === 0) {
              accepted.push({
                id: card.id,
                mode: card.mode,
                turns,
                tags: card.tags,
                teacher: `${model} (api)`,
                review: { status: "pending", by: "loop" },
              });
              return;
            }
            lastReasons = reasons;
            rejects.push({ cardId: card.id, attempt, reasons });
          } catch (err) {
            lastReasons = [`teacher-error: ${err instanceof Error ? err.message : String(err)}`];
            rejects.push({ cardId: card.id, attempt, reasons: lastReasons });
          }
        }
        failed.push(card.id);
      }),
    );
    console.log(`  ...${Math.min(i + CONCURRENCY, pending.length)}/${pending.length} cards processed`);
  }

  if (accepted.length > 0) {
    mkdirSync(dirname(DATASET_PATH), { recursive: true });
    appendFileSync(DATASET_PATH, accepted.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }
  if (rejects.length > 0) {
    mkdirSync(WORK_DIR, { recursive: true });
    appendFileSync(
      join(WORK_DIR, "rejects.jsonl"),
      rejects.map((r) => JSON.stringify({ ...r, at: new Date().toISOString() })).join("\n") + "\n",
    );
  }
  console.log(
    `Accepted ${accepted.length}/${pending.length}; rejected candidates ${rejects.length}; cards failed after ${MAX_ATTEMPTS} attempts: ${failed.length}${failed.length ? ` (${failed.join(", ")})` : ""}`,
  );
  printStatus();
}

/**
 * `batch` mode: submits the pending cards through the Messages Batches API
 * (50% cheaper than live calls, same model/prompt — no quality change).
 * One attempt per card (no in-batch retry loop — retries belong to a
 * follow-up `batch`/`api` run over the still-pending cards); results can
 * take up to ~1 hour. Polls every 20s and prints progress.
 */
async function runBatch(count: number, model: string): Promise<void> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: loadApiKey(), maxRetries: 5 });
  const pending = deck.filter((c) => !doneIds.has(c.id)).slice(0, count);
  const byId = new Map(pending.map((c) => [c.id, c]));
  console.log(`Batch API: submitting ${pending.length} cards via ${model}...`);

  const submitted = await client.messages.batches.create({
    requests: pending.map((card) => ({
      custom_id: card.id,
      params: {
        model,
        max_tokens: estimateMaxTokens(card),
        system: SYSTEM_MSG,
        messages: [{ role: "user" as const, content: renderTeacherPrompt(card) }],
      },
    })),
  });
  console.log(`Batch ${submitted.id} submitted — polling...`);

  let batch = submitted;
  while (batch.processing_status !== "ended") {
    await new Promise((r) => setTimeout(r, 20_000));
    batch = await client.messages.batches.retrieve(submitted.id);
    console.log(`  status: ${batch.processing_status} — ${JSON.stringify(batch.request_counts)}`);
  }

  const accepted: DatasetRecord[] = [];
  const rejects: { cardId: string; attempt: number; reasons: string[] }[] = [];
  for await (const result of await client.messages.batches.results(submitted.id)) {
    const card = byId.get(result.custom_id);
    if (!card) continue;
    if (result.result.type !== "succeeded") {
      rejects.push({ cardId: card.id, attempt: 0, reasons: [`teacher-error: batch result ${result.result.type}`] });
      continue;
    }
    try {
      const text = result.result.message.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("");
      const turns = parseTeacherReply(text);
      const reasons = runFilters(turns, card);
      if (reasons.length === 0) {
        accepted.push({
          id: card.id,
          mode: card.mode,
          turns,
          tags: card.tags,
          teacher: `${model} (batch)`,
          review: { status: "pending", by: "loop" },
        });
      } else {
        rejects.push({ cardId: card.id, attempt: 0, reasons });
      }
    } catch (err) {
      rejects.push({
        cardId: card.id,
        attempt: 0,
        reasons: [`teacher-error: ${err instanceof Error ? err.message : String(err)}`],
      });
    }
  }

  if (accepted.length > 0) {
    mkdirSync(dirname(DATASET_PATH), { recursive: true });
    appendFileSync(DATASET_PATH, accepted.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }
  if (rejects.length > 0) {
    mkdirSync(WORK_DIR, { recursive: true });
    appendFileSync(
      join(WORK_DIR, "rejects.jsonl"),
      rejects.map((r) => JSON.stringify({ ...r, at: new Date().toISOString() })).join("\n") + "\n",
    );
  }
  console.log(
    `Batch done. Accepted ${accepted.length}/${pending.length}; rejected ${rejects.length}. Re-run \`batch\` or \`api\` to retry the still-pending cards.`,
  );
  printStatus();
}

/**
 * `compare` mode: runs the SAME N cards through two models, single attempt
 * each (no retry — measuring raw first-pass capability), and writes a
 * side-by-side markdown report. Does NOT touch the dataset or deck state —
 * purely a decision aid before committing a model choice to the real run.
 */
async function runCompare(count: number, models: string[]): Promise<void> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: loadApiKey(), maxRetries: 5 });
  const sample = deck.filter((c) => !doneIds.has(c.id)).slice(0, count);
  console.log(`Comparing ${models.join(" vs ")} on ${sample.length} cards (1 attempt each, no ingest)...`);

  type Outcome = { card: ScenarioCard; turns?: DialogueTurn[]; reasons: string[]; error?: string };
  const byModel = new Map<string, Outcome[]>();

  for (const model of models) {
    const outcomes: Outcome[] = [];
    const CONCURRENCY = 2;
    for (let i = 0; i < sample.length; i += CONCURRENCY) {
      const group = sample.slice(i, i + CONCURRENCY);
      await Promise.all(
        group.map(async (card) => {
          try {
            const turns = await generateOne(client, card, model, "");
            outcomes.push({ card, turns, reasons: runFilters(turns, card) });
          } catch (err) {
            outcomes.push({ card, reasons: [], error: err instanceof Error ? err.message : String(err) });
          }
        }),
      );
    }
    byModel.set(model, outcomes);
    const passed = outcomes.filter((o) => o.turns && o.reasons.length === 0).length;
    console.log(`  ${model}: ${passed}/${sample.length} passed on first attempt`);
  }

  const lines: string[] = [
    `# M2 teacher comparison (${new Date().toISOString().slice(0, 10)})`,
    "",
    `${sample.length} cards, single attempt per model, NOT ingested into the dataset.`,
    "",
    "| model | passed (1st attempt) | pass rate |",
    "|---|---|---|",
  ];
  for (const model of models) {
    const outcomes = byModel.get(model)!;
    const passed = outcomes.filter((o) => o.turns && o.reasons.length === 0).length;
    lines.push(`| ${model} | ${passed}/${sample.length} | ${((passed / sample.length) * 100).toFixed(0)}% |`);
  }
  lines.push("", "## Transcripts", "");
  for (const card of sample) {
    lines.push(`### ${card.id} — ${card.mode} [${card.tags.join(", ")}]`, "");
    for (const model of models) {
      const outcome = byModel.get(model)!.find((o) => o.card.id === card.id)!;
      lines.push(`**${model}** ${outcome.error ? `— ERROR: ${outcome.error}` : outcome.reasons.length ? `— REJECTED: ${outcome.reasons.join(" | ")}` : "— PASSED"}`, "");
      if (outcome.turns) {
        for (const t of outcome.turns) lines.push(`- *${t.role}:* ${t.content}`);
        lines.push("");
      }
    }
  }

  const outPath = join(WORK_DIR, `compare-${Date.now()}.md`);
  mkdirSync(WORK_DIR, { recursive: true });
  writeFileSync(outPath, lines.join("\n"));
  console.log(`Wrote comparison report -> ${outPath}`);
}

switch (command) {
  case "status": {
    printStatus();
    break;
  }

  case "api": {
    const count = Number(flag("count", "50"));
    // Decided 2026-07-17 (Sharang, interactive) after a Sonnet-vs-Haiku
    // comparison: Haiku 4.5 for the bulk run — comparable per-turn quality
    // at a fraction of the cost. See DATASET.md §5.
    const model = flag("model", "claude-haiku-4-5");
    await runApiBatch(count, model);
    break;
  }

  case "batch": {
    const count = Number(flag("count", "200"));
    const model = flag("model", "claude-haiku-4-5");
    await runBatch(count, model);
    break;
  }

  case "compare": {
    const count = Number(flag("count", "15"));
    const models = flag("models", "claude-sonnet-5,claude-haiku-4-5").split(",").map((m) => m.trim());
    await runCompare(count, models);
    break;
  }

  case "cards": {
    const count = Number(flag("count", "25"));
    const pending = deck.filter((c) => !doneIds.has(c.id)).slice(0, count);
    mkdirSync(WORK_DIR, { recursive: true });
    const outPath = join(WORK_DIR, "pending-cards.json");
    writeFileSync(
      outPath,
      JSON.stringify(
        pending.map((card) => ({ card, prompt: renderTeacherPrompt(card) })),
        null,
        2,
      ),
    );
    console.log(`Dealt ${pending.length} cards -> ${outPath}`);
    for (const c of pending)
      console.log(
        `  ${c.id}  ${c.mode}/${c.lengthBand} userTurns=${c.userTurns} topic="${c.topic}" detail=${c.plantedDetail ? `"${c.plantedDetail}"` : "-"} tags=[${c.tags.join(",")}]`,
      );
    break;
  }

  case "ingest": {
    const file = rest.find((a) => !a.startsWith("--"));
    if (!file) {
      console.error("usage: ingest <batch.json>");
      process.exit(1);
    }
    const batch = JSON.parse(readFileSync(file, "utf-8")) as AuthoredDialogue[];
    const { accepted, rejected } = ingestBatch(deck, doneIds, batch, TEACHER_LABEL);

    if (accepted.length > 0) {
      mkdirSync(dirname(DATASET_PATH), { recursive: true });
      appendFileSync(DATASET_PATH, accepted.map((r) => JSON.stringify(r)).join("\n") + "\n");
    }
    if (rejected.length > 0) {
      mkdirSync(WORK_DIR, { recursive: true });
      appendFileSync(
        join(WORK_DIR, "rejects.jsonl"),
        rejected.map((r) => JSON.stringify({ ...r, at: new Date().toISOString() })).join("\n") + "\n",
      );
    }

    console.log(`Accepted ${accepted.length}/${batch.length}; rejected ${rejected.length}.`);
    for (const r of rejected) console.log(`  REJECT ${r.cardId}: ${r.reasons.join(" | ")}`);
    printStatus();
    if (rejected.length > 0) process.exit(2);
    break;
  }

  case "sample": {
    const count = Number(flag("count", "20"));
    const out = flag("out", join(ROOT, "docs", "model-quality", "samples", "review-sample.md"));
    // Stratified: proportional per mode, safety-mirror records always included (§6).
    const safety = records.filter((r) => r.tags.some((t) => t.startsWith("safety-")));
    const rest_ = records.filter((r) => !r.tags.some((t) => t.startsWith("safety-")));
    const picked: DatasetRecord[] = [...safety];
    for (const mode of ["freewrite", "checkin", "thoughtrecord", "gratitude"]) {
      const pool = rest_.filter((r) => r.mode === mode);
      const want = Math.max(1, Math.round((count - safety.length) * (pool.length / Math.max(1, rest_.length))));
      picked.push(...pool.filter((_, i) => i % Math.max(1, Math.ceil(pool.length / want)) === 0).slice(0, want));
    }
    const lines = [
      `# M2 dataset review sample (${new Date().toISOString().slice(0, 10)})`,
      "",
      `${picked.length} of ${records.length} accepted records, quoted verbatim for Sharang's tone`,
      "veto (DATASET.md §6). Safety-mirror records are ALL included. Review rubric: the M1",
      'dimensions + "would this reply feel warm or canned to a real journaler?"',
      "",
    ];
    for (const r of picked) {
      lines.push(`## ${r.id} — ${r.mode} [${r.tags.join(", ")}]`, "");
      for (const t of r.turns) lines.push(`**${t.role}:** ${t.content}`, "");
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, lines.join("\n"));
    console.log(`Wrote ${picked.length}-dialogue review sample -> ${out}`);
    break;
  }

  default:
    console.error("usage: m2-loop-teacher.ts <status|cards|ingest|api|batch|compare|sample> [flags]");
    process.exit(1);
}
