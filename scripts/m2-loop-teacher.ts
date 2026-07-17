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
  M2_TARGET_COUNT,
  type AuthoredDialogue,
  type DatasetRecord,
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

switch (command) {
  case "status": {
    printStatus();
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
    console.error("usage: m2-loop-teacher.ts <status|cards|ingest|sample> [flags]");
    process.exit(1);
}
