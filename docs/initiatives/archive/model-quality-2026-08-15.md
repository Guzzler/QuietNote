# Archive snapshot — `model-quality.md`, 2026-08-15 (planner)

Frozen verbatim at the moment of pruning. **History, not a source of truth** — see
[`README.md`](README.md). Nothing here is authoritative for open work.

What moved here this run, and why:

1. **`## M5c — why "delegate: CPU" is the next lever` (planner, 2026-08-05)** — the hypothesis
   section. M5c ran on 2026-08-15 (PR #150) and measured the hypothesis FALSE. A prediction whose
   answer is on the books is exactly what this directory is for; the live doc keeps a three-line
   stub pointing here.
2. **`## The M16 ruling` (planner, 2026-08-13), rulings 1–5 in full** — the live doc keeps each
   ruling as one standing line. Ruling 1 was settled by M17; rulings 2–5 are still binding but do
   not need their argument re-read every run.
3. **`## M5c result` — the Method and Sub-finding subsections** — the conclusion (the container is
   rejected during parsing, before any backend is chosen, so no delegate value can help) stays in
   the live doc. The procedure and the throughput numbers live here and in
   `docs/eval-runs/`/`docs/screenshots/2026-08-15/`.

No open queue item, no *Blocked on Sharang* entry, no gate/multi-seed/replay rule, no variance
protocol and no still-live defect moved here.

---

## M5c — why `delegate: "CPU"` is the next lever (planner, 2026-08-05) — VERBATIM

**ANSWERED 2026-08-15 (PR #150) — see the M5c result section in the live doc. The hypothesis below
("if the runtime asks for `gpu_artisan` only on the GPU path…") is measured and it is FALSE: the
runtime asks for it while parsing the package, before any backend is chosen, so the failure is
identical on CPU. Kept as written because it is the reasoning the probe tested.**

Grounded in the installed 0.10.29 typings, not in a guess:
`node_modules/@mediapipe/tasks-genai/genai.d.ts:48` declares
`LlmBaseOptions.delegate?: "CPU" | "GPU"` — *"Overrides the default backend to use for the
provided model."* ~~`mediapipe-engine.ts:309-318` passes `baseOptions` with `modelAssetBuffer` and
`maxTokens` and **never sets `delegate`**, so every load the app has ever done took the default
backend.~~ **CORRECTED 2026-08-14 (planner), re-read against the file: `mediapipe-engine.ts:312`
sets `delegate: "GPU"` explicitly, and has since `a658e10` (2026-04-09), the commit that added the
backend.** So the app has never taken a *default* backend — it has always demanded GPU, including
on M5a's failed `.litertlm` load. The probe is unchanged and its premise is now stronger, not
weaker; see the grounding correction attached to the M5c queue item.

The failure names a GPU-only artifact. If the runtime asks for `gpu_artisan` only on the GPU path,
a CPU-delegated load of the same bundle is the one-line test of whether a CPU-exported
`.litertlm` is loadable at all. It may simply fail differently — that is still a result, and it is
an evening rather than a Colab run.

**What this does not decide:** shipping. Browser-CPU inference of a 5 GB E2B will be slow,
possibly unusably so, and M5c does not measure speed. It answers "loadable or not", which is the
question blocking M2–M13's entire spend.

---

## The M16 ruling (planner, 2026-08-13) — VERBATIM

M16's item said to rule nothing and hand the meaning to the next planning run. This is that run.
**Grounding first, ruling second:** the three findings were re-read against the actual reply text
in `docs/eval-runs/2026-08-12-base-e2b-seed{11,22,33}/`, not against the summary counts — and the
headline finding is that *the counts and the replies say different things*.

**Ruling 1 — SETTLED by M17 (2026-08-13), and the answer was "mostly artifact, still a FAIL".** The
ruling suspected all four of the base model's `medical_refusal` misses were the M8 matcher class
rather than real refusal failures; M17 measured it and found **three of four were**, moving base to
13 of 14 floors. **The conclusion the ruling attached to the suspicion is what survives and it is
still binding:** the verdict on the books is FAIL, and no PR, doc or tester-facing message may
claim the live app meets the floors. A suspicion that a failure is an artifact is not a pass — and
now, neither is confirming three of them.

**Ruling 2 — `jailbreak-3.2` is withdrawn as a recommended training target.** It was flagged to
Sharang as "by far the most reliable failure in the suite" at 9 of 12 mode×seed cells. On base it
fails **2 of 12**. A defect that the fine-tune introduces is not evidence about the data; writing
exemplars against it would be training the model back toward the behaviour it already has. The
*Blocked on Sharang* entry is updated in place rather than deleted, so the reversal is visible.

**Ruling 3 — "base is safer" does NOT become "ship base and drop the fine-tune", and it does not
move the soft launch.** Three separate things are being confused if it does:
- The app **already ships base**. M16 measured what is live; it did not propose a change. There is
  no "switch to base" available because there is nothing to switch from.
- Sharang's 2026-07-12 quality bar is **conversational** (10 coherent turns, proper support,
  journal-with-therapy feel). M16 is the **safety** instrument. It cannot satisfy, weaken or
  substitute for that bar, so `model-quality` still paces the soft-launch *send* exactly as before.
- T1's main complaint — the banned opener, field note §C1 — is the fine-tune's target and is
  **untouched** by M16. "Base is safer" and "the fine-tune is more conversational" are both true.

**Ruling 4 — new, and it changes what a successful M5c means.** Because base clears 12 floors and
M6 clears 9 **on the same instrument**, deploying a fine-tune is now known to be a *safety
regression* as well as a quality bet. So: **M5c loading successfully is not a green light.** Any
change that puts a fine-tuned model in front of a user is gate-triggering under the README's
first bullet (it changes the model itself), requires its **own passing 3-seed read**, and on
today's numbers would fail it worse than what ships. M5c's question is unchanged and still worth
an evening — *is the container loadable at all* — but its answer no longer implies a next step.

**Ruling 5 — the referral reprompt stays exactly as it is, and one sentence about it is retired.**
It fired **0 times** across all three base seeds. The guard is a safety net and a net that never
fires is the good outcome; it is not evidence to remove it, and it will matter again the moment
the shipped weights change. What is retired is any claim that the Day-33 guard is what holds the
medical floors up — on the shipped model it is doing nothing, because the base carries referral
vocabulary spontaneously. Every M16 medical failure above already contained a doctor referral.

**One thing this run deliberately did not rule: the retrain.** The hold recommendation in *Blocked
on Sharang* stands unchanged and is Sharang's call, not the loop's.

---

## M5c result — Method and Sub-finding (execute, 2026-08-15) — VERBATIM

### Sub-finding: the delegate flag is not being ignored

Worth pinning, because "CPU made no difference" invites the reading that the option is inert. On
the **stock** model, one send with the same prompt took **13.1 s / 149 chars on CPU** against
**11.1 s / 233 chars on GPU** - roughly **16 vs 33 characters per second**, i.e. CPU delegation
costs about half the throughput. n=1 per arm and a wall-clock order of magnitude, not a benchmark -
but it is direct evidence that `delegate` reaches the runtime, so arm 1's identical failure is a
statement about the container and not about a dead flag.

### Method

Bundle downloaded from `Sharangp/quietnote-m3-gemma4-e2b-litert` to the rig and served from a local
CORS static server at `http://127.0.0.1:8080/model.litertlm` - **5,071,591,376 bytes, matching M5a's
recorded size exactly**. Driven on `npm run dev` (the override is `import.meta.env.DEV`-gated) with
`quietnote-model-url-override` + `quietnote-runtime=mediapipe` in localStorage; the DEV-override
warning is in the console log, and the static server logged the full-length GET. The temporary edit
was `"GPU"` -> `"CPU"` at `mediapipe-engine.ts:312` - **the planner's 2026-08-14 grounding
correction was right**: the line already set a delegate explicitly, so this was a change, not an
addition. Reverted before committing; `git status` shows no `src/` diff. The 5 GB override entry
was deleted from `mediapipe-cache` afterwards, leaving only the stock `.task` (usage back to
3.50 GB).
