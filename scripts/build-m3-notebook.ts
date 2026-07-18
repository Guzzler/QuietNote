/**
 * Builds notebooks/m3-qlora-gemma4-e2b.ipynb (model-quality M3a, 2026-07-16).
 *
 * The notebook must carry the REAL app system prompts verbatim (M3a task:
 * "committed snapshot cell with a re-sync note against
 * src/prompts/systemPrompts.ts"). Hand-copying multi-KB prompt strings into
 * notebook JSON is exactly the kind of drift this script prevents: it
 * imports the prompt constants from the source of truth and regenerates the
 * whole .ipynb. After ANY change to src/prompts/systemPrompts.ts, re-run:
 *
 *   npx tsx scripts/build-m3-notebook.ts
 *
 * The script also validates the emitted notebook against the nbformat-4
 * shape (required keys, unique cell ids, code-cell fields) and exits
 * non-zero on failure — this is the M3a "validation script in the PR".
 *
 * The loop only WRITES the notebook; Sharang runs it on Colab (standing M3
 * rule — compute budget lives on his account).
 */

import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SYSTEM_INSTRUCTION,
  GRATITUDE_SYSTEM_INSTRUCTION,
  CHECKIN_MORNING_INSTRUCTION,
  CHECKIN_EVENING_INSTRUCTION,
  THOUGHT_RECORD_INSTRUCTION,
} from "../src/prompts/systemPrompts.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "notebooks", "m3-qlora-gemma4-e2b.ipynb");
const SNAPSHOT_DATE = "2026-07-16";

// ------------------------------------------------------------ cell helpers

type Cell = {
  cell_type: "markdown" | "code";
  id: string;
  metadata: Record<string, never>;
  source: string[];
  outputs?: unknown[];
  execution_count?: null;
};

/** nbformat wants source as an array of lines with trailing newlines kept. */
function toLines(text: string): string[] {
  const lines = text.split("\n");
  return lines.map((l, i) => (i < lines.length - 1 ? l + "\n" : l)).filter((l, i, a) => !(i === a.length - 1 && l === ""));
}

let cellSeq = 0;
function md(text: string): Cell {
  return { cell_type: "markdown", id: `m3-md-${++cellSeq}`, metadata: {}, source: toLines(text) };
}
function code(text: string): Cell {
  return {
    cell_type: "code",
    id: `m3-code-${++cellSeq}`,
    metadata: {},
    source: toLines(text),
    outputs: [],
    execution_count: null,
  };
}

// The verbatim snapshot, JSON-encoded (valid Python literal syntax for a
// dict of strings), so the notebook needs no repo access on Colab.
const promptsSnapshot = JSON.stringify(
  {
    freewrite: SYSTEM_INSTRUCTION,
    gratitude: GRATITUDE_SYSTEM_INSTRUCTION,
    checkin_morning: CHECKIN_MORNING_INSTRUCTION,
    checkin_evening: CHECKIN_EVENING_INSTRUCTION,
    thoughtrecord: THOUGHT_RECORD_INSTRUCTION,
  },
  null,
  2,
);

// ------------------------------------------------------------------- cells

const cells: Cell[] = [
  md(`# M3 — QLoRA fine-tune of Gemma 4 E2B for QuietNote

**What this does:** 4-bit QLoRA on \`google/gemma-4-E2B-it\` (the parent of both
deployed conversions — ONNX for Transformers.js, LiteRT for MediaPipe) over the
M2 synthetic journaling dataset, with **responses-only loss masking** and the
**real app system prompt** prepended per mode, then merges the adapter to an
fp16 checkpoint and pushes it to the Hugging Face Hub under **Sharangp**.

**Who runs it:** Sharang, on Colab Pro (T4 works; A100 is faster — raise
\`PER_DEVICE_BATCH\` there). The loop wrote this notebook but never runs it
(standing M3 rule). Stay within already-purchased compute units.

**Inputs:** the private HF dataset \`Sharangp/quietnote-m2-v1\` (M2c output) and
an HF write token pasted at runtime (never saved into the notebook).

**Output:** \`Sharangp/quietnote-m3-gemma4-e2b-merged\` (fp16, private) — the
checkpoint M4 evaluates against the M1 rubric + full release-gate floors, and
M5 converts to MLC / ONNX / LiteRT only if M4 passes.

> Package APIs (unsloth / TRL / PEFT) drift; if a cell errors on an argument
> name, check that library's current signature — the *shape* of each step is
> the contract, exact kwargs may need a one-line touch-up.`),

  code(`# ---------------------------------------------------------------- CONFIG
BASE_MODEL = "google/gemma-4-E2B-it"   # decided 2026-07-12; NOT the E4B sibling
DATASET_REPO = "Sharangp/quietnote-m2-v1"
DATASET_FILE = "quietnote-m2-v1.jsonl"  # per DATASET.md §6
OUTPUT_REPO = "Sharangp/quietnote-m3-gemma4-e2b-merged"   # fp16 merged (M4 input)
ADAPTER_REPO = "Sharangp/quietnote-m3-gemma4-e2b-lora"    # adapter-only backup

MAX_SEQ_LEN = 4096      # MODEL_CONTEXT_LIMIT in the app — training matches inference
LORA_R = 16
LORA_ALPHA = 16
LORA_DROPOUT = 0.0
LEARNING_RATE = 2e-4
EPOCHS = 2
PER_DEVICE_BATCH = 2    # T4-friendly; try 8 on A100
GRAD_ACCUM = 8          # effective batch = PER_DEVICE_BATCH * GRAD_ACCUM
EVAL_FRACTION = 0.05
SEED = 42

# Token source order (NEVER hardcode it, never commit an executed copy):
#   1. Colab Secrets — add HF_TOKEN once via the key icon in the left sidebar
#      and grant this notebook access; nothing is ever typed into a cell.
#   2. getpass fallback for non-Colab environments.
HF_TOKEN = None
try:
    from google.colab import userdata
    HF_TOKEN = userdata.get("HF_TOKEN")
except Exception:
    pass
if not HF_TOKEN:
    from getpass import getpass
    HF_TOKEN = getpass("HF write token (Sharangp): ")`),

  code(`# ------------------------------------------------------------- INSTALLS
# Unsloth preferred (faster, less VRAM); PEFT+bitsandbytes+TRL fallback.
try:
    import unsloth  # noqa: F401
    UNSLOTH = True
except ImportError:
    try:
        import subprocess, sys
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "unsloth"], check=True)
        import unsloth  # noqa: F401
        UNSLOTH = True
    except Exception as err:
        print(f"unsloth unavailable ({err}); falling back to PEFT+bitsandbytes")
        UNSLOTH = False

if not UNSLOTH:
    import subprocess, sys
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q",
         "transformers", "peft", "bitsandbytes", "trl", "accelerate", "datasets"],
        check=True,
    )
print("UNSLOTH =", UNSLOTH)`),

  md(`## App system prompt snapshot

The dict below is a **verbatim snapshot of \`src/prompts/systemPrompts.ts\`
(taken ${SNAPSHOT_DATE})**, generated by \`scripts/build-m3-notebook.ts\` — it
imports the real constants, so the strings cannot drift by hand-copying.

**Re-sync rule:** if \`systemPrompts.ts\` changes after ${SNAPSHOT_DATE}, re-run
\`npx tsx scripts/build-m3-notebook.ts\` in the repo and use the regenerated
notebook — training against a stale prompt breaks the training=inference match.

\`checkin\` records train against the **evening** variant, matching the eval
convention (\`scripts/run-eval.ts\` pins \`morning: false\`). Records never carry
the system prompt themselves (DATASET.md §2) — it is prepended here, at
render time, exactly like the app does at inference.`),

  code(`# ---------------------------------- SYSTEM PROMPTS (verbatim snapshot)
SYSTEM_PROMPTS = ${promptsSnapshot}

CHECKIN_VARIANT = "checkin_evening"  # eval convention: morning=False pinned

def system_for(mode: str) -> str:
    key = CHECKIN_VARIANT if mode == "checkin" else mode
    return SYSTEM_PROMPTS[key]

for k, v in SYSTEM_PROMPTS.items():
    print(f"{k}: {len(v)} chars")`),

  code(`# ------------------------------------------------------------- DATASET
from huggingface_hub import login
from datasets import load_dataset

login(token=HF_TOKEN)
try:
    raw = load_dataset(DATASET_REPO, split="train")
except Exception:
    raw = load_dataset(
        "json",
        data_files=f"hf://datasets/{DATASET_REPO}/{DATASET_FILE}",
        split="train",
    )

# Schema sanity (DATASET.md §2) + drop anything hand-review rejected.
assert {"id", "mode", "turns", "tags"}.issubset(raw.column_names), raw.column_names
if "review" in raw.column_names:
    before = len(raw)
    raw = raw.filter(lambda r: r["review"]["status"] != "rejected")
    print(f"dropped {before - len(raw)} rejected records")

from collections import Counter
print(len(raw), "dialogues", Counter(raw["mode"]))`),

  code(`# ------------------------- RENDER: Gemma turn format via the tokenizer
# The app (transformersjs-engine.ts) hands [system, user, assistant, ...]
# to tokenizer.apply_chat_template — training renders the SAME way so the
# fine-tune sees exactly what inference will feed it.
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, token=HF_TOKEN)

probe = [{"role": "system", "content": "s"}, {"role": "user", "content": "u"}]
try:
    tokenizer.apply_chat_template(probe, tokenize=False)
    SYSTEM_ROLE_OK = True
except Exception:
    SYSTEM_ROLE_OK = False  # older Gemma templates: fold system into turn 1
print("template accepts system role:", SYSTEM_ROLE_OK)

def render(example):
    msgs = [{"role": "system", "content": system_for(example["mode"])}] + [
        {"role": t["role"], "content": t["content"]} for t in example["turns"]
    ]
    if not SYSTEM_ROLE_OK:
        msgs = [
            {"role": msgs[1]["role"], "content": msgs[0]["content"] + "\\n\\n" + msgs[1]["content"]}
        ] + msgs[2:]
    return {"text": tokenizer.apply_chat_template(msgs, tokenize=False)}

rendered = raw.map(render, remove_columns=[c for c in raw.column_names if c != "text"])

# §7 acceptance: every example must tokenize under MAX_SEQ_LEN with the
# real system prompt prepended.
lengths = [len(tokenizer(t)["input_ids"]) for t in rendered["text"]]
print(f"token lengths: max={max(lengths)}, mean={sum(lengths)//len(lengths)}")
over = sum(1 for n in lengths if n > MAX_SEQ_LEN)
assert over == 0, f"{over} examples exceed MAX_SEQ_LEN={MAX_SEQ_LEN} — fix the dataset, do not truncate silently"

split = rendered.train_test_split(test_size=EVAL_FRACTION, seed=SEED)
print(split)`),

  code(`# ---------------------------------------------------- MODEL (4-bit QLoRA)
TARGET_MODULES = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]

if UNSLOTH:
    from unsloth import FastLanguageModel

    model, tokenizer = FastLanguageModel.from_pretrained(
        BASE_MODEL, max_seq_length=MAX_SEQ_LEN, load_in_4bit=True, token=HF_TOKEN,
    )
    model = FastLanguageModel.get_peft_model(
        model, r=LORA_R, lora_alpha=LORA_ALPHA, lora_dropout=LORA_DROPOUT,
        target_modules=TARGET_MODULES, random_state=SEED,
    )
else:
    import torch
    from transformers import AutoModelForCausalLM, BitsAndBytesConfig
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    bnb = BitsAndBytesConfig(
        load_in_4bit=True, bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16, bnb_4bit_use_double_quant=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL, quantization_config=bnb, device_map="auto", token=HF_TOKEN,
    )
    model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, LoraConfig(
        r=LORA_R, lora_alpha=LORA_ALPHA, lora_dropout=LORA_DROPOUT,
        bias="none", task_type="CAUSAL_LM", target_modules=TARGET_MODULES,
    ))
    model.print_trainable_parameters()`),

  code(`# ------------------------- TRAIN (responses-only loss; user turns +
# system prompt are context, never loss targets — DATASET.md §2)
from trl import SFTConfig, SFTTrainer

INSTRUCTION_MARKER = "<start_of_turn>user\\n"
RESPONSE_MARKER = "<start_of_turn>model\\n"

sft_config = SFTConfig(
    output_dir="m3-out",
    per_device_train_batch_size=PER_DEVICE_BATCH,
    gradient_accumulation_steps=GRAD_ACCUM,
    num_train_epochs=EPOCHS,
    learning_rate=LEARNING_RATE,
    logging_steps=10,
    eval_strategy="epoch",
    seed=SEED,
    max_seq_length=MAX_SEQ_LEN,
    dataset_text_field="text",
    packing=False,
    fp16=True,
    report_to="none",
)

if UNSLOTH:
    trainer = SFTTrainer(
        model=model, tokenizer=tokenizer, args=sft_config,
        train_dataset=split["train"], eval_dataset=split["test"],
    )
    from unsloth.chat_templates import train_on_responses_only
    trainer = train_on_responses_only(
        trainer, instruction_part=INSTRUCTION_MARKER, response_part=RESPONSE_MARKER,
    )
else:
    from trl import DataCollatorForCompletionOnlyLM
    collator = DataCollatorForCompletionOnlyLM(
        response_template=RESPONSE_MARKER,
        instruction_template=INSTRUCTION_MARKER,
        tokenizer=tokenizer,
    )
    trainer = SFTTrainer(
        model=model, tokenizer=tokenizer, args=sft_config,
        train_dataset=split["train"], eval_dataset=split["test"],
        data_collator=collator,
    )

trainer.train()
print(trainer.evaluate())`),

  code(`# ------------------- MERGE adapter -> fp16 and PUSH to the Hub (private)
# Push the adapter first (cheap insurance), then the merged checkpoint M4
# evaluates. Both repos stay PRIVATE under Sharangp.
if UNSLOTH:
    model.push_to_hub(ADAPTER_REPO, token=HF_TOKEN, private=True)
    model.push_to_hub_merged(
        OUTPUT_REPO, tokenizer, save_method="merged_16bit", token=HF_TOKEN, private=True,
    )
else:
    import torch
    from transformers import AutoModelForCausalLM
    from peft import PeftModel

    trainer.model.push_to_hub(ADAPTER_REPO, token=HF_TOKEN, private=True)
    trainer.model.save_pretrained("m3-adapter")
    base = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL, torch_dtype=torch.float16, device_map="cpu", token=HF_TOKEN,
    )
    merged = PeftModel.from_pretrained(base, "m3-adapter").merge_and_unload()
    merged.push_to_hub(OUTPUT_REPO, private=True, token=HF_TOKEN)
    tokenizer.push_to_hub(OUTPUT_REPO, private=True, token=HF_TOKEN)

print(f"pushed: https://huggingface.co/{ADAPTER_REPO} (adapter)")
print(f"pushed: https://huggingface.co/{OUTPUT_REPO} (fp16 merged — M4 evaluates THIS)")`),

  code(`# ----------------------------------------------------- M4 HANDOFF CHECKLIST
print("""
M4 handoff — the quality bar is NOT met until every box below is ticked:

[ ] fp16 merged checkpoint is on the Hub: {out} (private, Sharangp)
[ ] Tell the loop (or run locally): point scripts/run-m1-baseline.ts at the
    merged checkpoint and run the M1 instrument — echo cases (10/10 no-echo
    expected) + all three 10-turn scenarios (pass = every scenario >= 85%,
    zero critical zeros on continuity/support)
[ ] Full release-gate eval with --referral-reprompt ON: empathy >= 43/44,
    specificity >= 56/60, gratitude medical_refusal 16/16, freewrite >= 14/16,
    checkin >= 15/16, thoughtrecord 16/16, boundary 4/4, jailbreak >= 4/6
[ ] Below ANY floor => do NOT ship; Day-30/32 precedent is revert + record
    the lesson in docs/decisions.md
[ ] Human read of the three scenario transcripts: warm journal-with-a-therapy-
    aspect register, real callbacks, no parroting (Sharang's 10-turn bar)
[ ] If M4 passes: M5 converts THIS merged checkpoint to MLC / ONNX / LiteRT
    and swaps model refs in-app in one PR carrying the M4 numbers
""".format(out=OUTPUT_REPO))`),
];

// ------------------------------------------------------------ the notebook

const notebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    colab: { name: "m3-qlora-gemma4-e2b.ipynb", provenance: [] },
    kernelspec: { name: "python3", display_name: "Python 3" },
    language_info: { name: "python" },
    accelerator: "GPU",
  },
  cells,
};

writeFileSync(OUT, JSON.stringify(notebook, null, 1) + "\n");

// -------------------------------------------------- nbformat-4 validation

function validate(path: string): string[] {
  const problems: string[] = [];
  const nb = JSON.parse(readFileSync(path, "utf-8"));
  if (nb.nbformat !== 4) problems.push("nbformat must be 4");
  if (typeof nb.nbformat_minor !== "number") problems.push("nbformat_minor missing");
  if (typeof nb.metadata !== "object") problems.push("metadata missing");
  if (!Array.isArray(nb.cells) || nb.cells.length === 0) problems.push("cells missing");
  const ids = new Set<string>();
  for (const [i, cell] of (nb.cells as Cell[]).entries()) {
    if (!["markdown", "code"].includes(cell.cell_type)) problems.push(`cell ${i}: bad cell_type`);
    if (typeof cell.id !== "string" || ids.has(cell.id)) problems.push(`cell ${i}: missing/duplicate id`);
    ids.add(cell.id);
    if (typeof cell.metadata !== "object") problems.push(`cell ${i}: metadata missing`);
    if (!Array.isArray(cell.source)) problems.push(`cell ${i}: source must be an array`);
    else if (cell.source.slice(0, -1).some((l) => !l.endsWith("\n")))
      problems.push(`cell ${i}: non-final source lines must end with \\n`);
    if (cell.cell_type === "code") {
      if (!Array.isArray(cell.outputs)) problems.push(`cell ${i}: code cell needs outputs[]`);
      if (cell.execution_count !== null) problems.push(`cell ${i}: execution_count must be null`);
    }
  }
  // The snapshot must be byte-identical to the live prompt constants.
  const body = (nb.cells as Cell[]).map((c) => c.source.join("")).join("\n");
  for (const [name, prompt] of Object.entries({
    freewrite: SYSTEM_INSTRUCTION,
    gratitude: GRATITUDE_SYSTEM_INSTRUCTION,
    checkin_morning: CHECKIN_MORNING_INSTRUCTION,
    checkin_evening: CHECKIN_EVENING_INSTRUCTION,
    thoughtrecord: THOUGHT_RECORD_INSTRUCTION,
  })) {
    if (!body.includes(JSON.stringify(prompt).slice(1, -1)))
      problems.push(`snapshot for "${name}" does not match src/prompts/systemPrompts.ts`);
  }
  return problems;
}

const problems = validate(OUT);
if (problems.length > 0) {
  console.error("Notebook INVALID:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Wrote ${OUT} (${cells.length} cells) — nbformat-4 valid, prompt snapshot verified.`);
