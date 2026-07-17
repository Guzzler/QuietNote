/**
 * M2 dataset generator CLI (model-quality M2b, 2026-07-16).
 *
 * Thin wrapper over src/utils/m2DatasetGenerator.ts — samples scenario
 * cards, asks the teacher for dialogues, runs the DATASET.md §5 filters
 * with reject-and-regenerate, and writes schema-valid JSONL + rejection
 * telemetry.
 *
 * Usage:
 *   npx tsx scripts/generate-m2-dataset.ts --teacher=mock --count 20
 *   npx tsx scripts/generate-m2-dataset.ts --teacher=anthropic --count 2000   # M2c — needs ANTHROPIC_API_KEY
 *
 * Flags: --teacher=mock|anthropic (default mock), --count N (default 2000),
 * --seed N (default 42), --out <path> (default datasets/quietnote-m2-<teacher>.jsonl),
 * --model <id> (anthropic teacher only; default claude-sonnet-5 — DATASET.md
 * §5 names a Sonnet-class teacher).
 *
 * §0 provenance: the mock teacher is fully synthetic templates; the
 * anthropic teacher writes both sides from a scenario card. No user text
 * can enter this pipeline.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateDataset,
  mockTeacher,
  renderTeacherPrompt,
  parseTeacherReply,
  type Teacher,
} from "../src/utils/m2DatasetGenerator.ts";

const args = process.argv.slice(2);
function flag(name: string, fallback: string): string {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--")) return args[idx + 1];
  return fallback;
}

const TEACHER = flag("teacher", "mock");
const COUNT = Number(flag("count", "2000"));
const SEED = Number(flag("seed", "42"));
const MODEL = flag("model", "claude-sonnet-5");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = flag("out", join(ROOT, "datasets", `quietnote-m2-${TEACHER}.jsonl`));

/** Real teacher (M2c): Claude via the Messages API. Requires ANTHROPIC_API_KEY. */
function makeAnthropicTeacher(): Teacher {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "--teacher=anthropic needs ANTHROPIC_API_KEY (M2c is blocked on Sharang adding it to .env.local; see docs/initiatives/model-quality.md).",
    );
    process.exit(1);
  }
  return async (card, attempt) => {
    // Deferred import so `--teacher=mock` (and the test suite) never touches the SDK.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You write high-quality synthetic training dialogues exactly to spec and output only JSON.",
      messages: [
        {
          role: "user",
          content:
            renderTeacherPrompt(card) +
            (attempt > 0
              ? `\n\nAttempt ${attempt + 1}: the previous candidate failed the mechanical filters — vary the phrasing and follow the contract more strictly.`
              : ""),
        },
      ],
    });
    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");
    return parseTeacherReply(text);
  };
}

async function main() {
  const teacher = TEACHER === "anthropic" ? makeAnthropicTeacher() : mockTeacher;
  const teacherLabel = TEACHER === "anthropic" ? MODEL : "mock";
  console.log(`Generating ${COUNT} dialogues (teacher=${teacherLabel}, seed=${SEED})...`);

  const { records, rejects, failedCards } = await generateDataset({
    count: COUNT,
    seed: SEED,
    teacher,
    teacherLabel,
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const rejectsPath = OUT.replace(/\.jsonl$/, "") + ".rejects.jsonl";
  writeFileSync(
    rejectsPath,
    rejects.length ? rejects.map((r) => JSON.stringify(r)).join("\n") + "\n" : "",
  );

  const byMode = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.mode] = (acc[r.mode] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Accepted: ${records.length}  Rejected candidates: ${rejects.length}  Failed cards: ${failedCards.length}`);
  console.log(`Slice shares: ${JSON.stringify(byMode)}`);
  console.log(`Wrote ${OUT}`);
  console.log(`Rejection telemetry: ${rejectsPath}`);
  if (failedCards.length > 0) {
    console.error(`Cards with no passing dialogue after retries: ${failedCards.join(", ")}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
