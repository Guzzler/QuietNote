# Initiative: model-quality (QLoRA fine-tune + conversational eval)

**Created 2026-07-11 (interactive, Sharang).** Trigger: watching the R1d
exchange live, Sharang's verdict was "pretty horrible" — the reply restated
his whole entry back pronoun-swapped. Direction: **run QLoRA and add an
adapter** — train and test a model that is genuinely conversational for
these journaling use cases.

**Mission:** QuietNote's replies read like a warm, natural conversational
companion — no parroting the entry back, no template smell — proven by a
conversational-quality eval, achieved by QLoRA fine-tuning the base model,
**without regressing a single safety floor** from the release gate.

**Quality bar (Sharang 2026-07-12, interactive — this initiative BLOCKS the
soft launch until it's met):** at least a **10-turn conversation** that
(a) makes logical sense across turns, (b) gives proper support, and
(c) feels akin to a journal with a therapy aspect to it. M1's eval must
encode this as a scored multi-turn scenario, and note: 10 turns must fit the
context budget (`MODEL_CONTEXT_LIMIT` 4096 with a ~1.6–1.9k-token system
prompt) — verify truncation behavior doesn't break coherence.

**Positioning (Sharang 2026-07-12): the thing to sell is a PERSONALIZED
journaling experience.** The unique claim only QuietNote can make: deep
personalization with zero data leaving the device — cloud journals must read
your entries to personalize; QuietNote personalizes *because* everything is
local. Consequences the loop must honor: (1) the eval bar tests
personalization specifically (does the reply use THIS user's details,
callbacks, and emotional throughline — not generic warmth?); (2) the M2
dataset trains it (exemplars where the model weaves in user-specific details
from earlier turns, recalls what the user said turns ago, adapts to their
tone); (3) README/F2/welcome copy sells "a journal that gets to know you —
and never phones home", not generic AI journaling.

**Quality bar — concrete pass thresholds (set 2026-07-12; M1 encodes, M4
must clear on the fine-tuned model before the bar counts as met):**
- **Three** scored 10-turn scenarios (not one): a freewrite emotional arc, a
  checkin-across-days arc with callbacks, and a thoughtrecord CBT arc.
- Per-turn rubric, each dimension 0–2 (fail/partial/pass): logical
  continuity (no contradiction with any earlier turn), supportive move
  present, personalization (uses ≥1 specific detail from an EARLIER turn,
  not the current one, where the scenario plants one), no-echo (opening
  n-gram overlap below the M1 threshold), no template smell.
- **Pass = every scenario ≥ 85% of max score, zero turns scoring 0 on
  continuity or support, and all release-gate safety floors intact.** The
  current models get baselined against this same rubric in M1 — expected to
  fail; the gap is what M2/M3 exist to close.

**Decisions (Sharang 2026-07-12, interactive):**
- **Base model: Gemma 4 E2B** (covers Transformers.js + MediaPipe with one
  fine-tune). Exact training base: **`google/gemma-4-E2B-it`**
  (https://huggingface.co/google/gemma-4-E2B-it — verified 2026-07-12,
  Apache 2.0, 2.3B effective params) — the parent of both deployed
  conversions (`onnx-community/gemma-4-E2B-it-ONNX`,
  `litert-community/gemma-4-E2B-it-litert-lm`). NOT `gemma-4-E4B` — the
  larger sibling is not what the app ships.
- **Training: Colab Pro** (Sharang subscribes; loop prepares the notebook).
- **Directional, confirm with M1 baseline:** WebLLM Gemma 2 2B is "probably
  much much worse and should be removed" — if the M1 baseline confirms it,
  queue removing the WebLLM backend, making Transformers.js (WASM-capable →
  works without WebGPU) the default. That would also dissolve most of
  public-release's unsupported-browser problem. Do not remove before the
  baseline exists. **Caveat from the R2 audit (2026-07-12, PR #86): the
  WASM-capable premise is currently false** — the ONNX q4f16 export fails on
  WASM/CPU (`GatherBlockQuantized` has no CPU kernel), so Transformers.js
  today requires WebGPU too. If WebLLM removal proceeds, the M5 conversion
  step must pick a WASM-loadable quantization (or the unsupported-browser
  problem does NOT dissolve).
- **M1b recommendation (2026-07-16, execute — Sharang decides): REMOVE
  WebLLM.** The data: Gemma 2 2B locks into verbatim self-repetition loops
  by mid-conversation (identical reply at 5 of 10 checkin turns; frozen
  from turn 5 in the thoughtrecord arc; qb-checkin-days rubric FAIL at
  84.9%) — it cannot carry the 10-turn quality bar no matter what the
  fine-tune does, because the fine-tune targets E2B, not this model. Both
  E2B paths pass the deterministic rubric today. Consolidating on Gemma 4
  E2B (Transformers.js default) also gives every user the fine-tune's
  benefit. The R2 caveat stands unchanged: ONNX q4f16 needs WebGPU, so
  removal does NOT dissolve the unsupported-browser problem unless M5
  picks a WASM-loadable quantization. Removal is NOT queued — per the
  2026-07-12 decision it needs Sharang's go, and the default-engine swap
  deserves its own increment (download-size copy, README, R1b matrix all
  reference WebLLM).

- **Pilot teacher model (2026-07-17, planner — Sharang's §6 tone veto is
  the override):** run the 500-dialogue pilot on **`claude-haiku-4-5` via
  the Messages Batches API**. Grounding: the 2026-07-17 15-card comparison
  (`datasets/m2-work/compare-1784275958477.md`, same cards, single attempt
  each) — Haiku 8/15 first-attempt filter pass vs Sonnet 5 3/15, with
  Sonnet's misses dominated by mechanical shape/JSON failures (3 "no JSON
  array" errors, non-alternating roles) that burn regenerate attempts; at
  roughly a third of the token price plus the 50% batch discount, retry
  economics strongly favor Haiku. First-attempt pass is NOT a quality
  claim — accepted-dialogue tone is judged only by Sharang's §6 review of
  the pilot sample; if Haiku reads flat there, rerun the pilot slice on
  Sonnet before the full spend. (Supersedes M2b's `claude-sonnet-5`
  default for the pilot only.)

- **Pilot fine-tune on the 357-record snapshot (2026-07-17, Sharang,
  interactive):** after reviewing the pilot sample, Sharang's call is
  "worth running that with this data and seeing how it works" — an M3
  **pipeline-pilot** training run on the 357 records, ahead of the full
  2,000. The snapshot was uploaded to the private HF dataset
  `Sharangp/quietnote-m2-v1` (`quietnote-m2-v1.jsonl`, 357 records) the
  same day; Sharang runs the notebook per the standing M3 rule.
  Expectations set: directional signal on warmth/anti-echo transfer +
  end-to-end de-risk of train→merge→M4-eval; NOT the shippable model
  (gratitude 58 records, safety mirror ~36 — thin). The full-spend go for
  the remaining ~1,400 cards is still a separate §6 decision. Review flags
  recorded from the sample read: a crystallizing house style (em-dash
  reframes, "There it is", question-ending turns) + recycled topic
  furniture (Harlow/pottery/transfer/3am across many dialogues) → add
  variety pressure before the full run; one diagnosis-adjacent phrase
  ("that's actually diagnosable stress response", tr-0296) → candidate
  filter-vocab addition.

- **Pilot fine-tune RAN 2026-07-17/18 (Sharang on Colab, interactive
  session with the loop).** Training succeeded on the 357-record snapshot:
  44/44 steps, 2 epochs, ~6 min on a bf16 GPU, LoRA 25.3M params (0.49%),
  val loss 2.11→2.00 (still falling — no overfit at 2 epochs). Artifacts
  pushed private under Sharangp: `quietnote-m3-gemma4-e2b-lora` (adapter) +
  `quietnote-m3-gemma4-e2b-merged` (fp16 — the M4 candidate). Colab smoke
  test (real app system prompt, app sampling params): the M1b live-failure
  entry ("Snapped at my best friend Jordan…", 0.84 overlap in the app)
  now gets a compressed, reframing, one-question reply — **tone transfer
  is real**; turn 2 showed semantic wobble in the question ("Does seeing
  nothing happen faster than hearing something") — style transfers before
  logical tightness at 357 records, strengthening the case for the full
  2,000. Also noted: model guessed a pronoun ("her") for an unspecified
  name → dataset exemplars should model pronoun-neutral handling. Notebook
  fixes from the run landed in PR #103 (bf16 autodetect; Gemma 4 turn
  markers `<|turn>user\n`/`<|turn>model\n` — verified against the real
  tokenizer; verbose pip).
- **ONNX conversion for Transformers.js is BLOCKED UPSTREAM (verified
  2026-07-18):** `gemma4` exists only in transformers 5.x (landed ~Mar
  2026) while `optimum-onnx` (0.1.0 AND GitHub main) pins
  `transformers<4.58` with no gemma4 export config — no version pair can
  export this architecture, and onnx-community's own gemma-4 ONNX
  conversion used unpublished tooling (model card documents usage only).
  Consequence: M4 scoring goes via a GGUF/llama.cpp 4-bit proxy (M4a
  below) and the in-app test goes via the LiteRT path (M5a below), which
  ai-edge-torch supports officially for fine-tuned Gemma. Worth one
  question in onnx-community's HF discussions about their recipe;
  M5's Transformers.js artifact depends on it or on optimum catching up.

This initiative supersedes the README parked-list line about eval work *for
this initiative's scope only* (new conversational-quality eval dimensions are
in scope here per Sharang's 2026-07-11 instruction). Everything else in the
parked list stays parked.

## Why the model parrots the entry (diagnosed 2026-07-11; updated 2026-07-14)

1. The prompt's FIRST-LINE/echo rules over-drive small quantized models
   (prompt-side fix FAILED the gate — M0, do not retry).
2. MediaPipe has NO repetition-penalty knob at all (M0 documented its API;
   per-call temperature now wired). The M1 headless E2B path WITH
   `repetition_penalty: 1.3` shows near-zero echo — so the live parroting
   plausibly lives in MediaPipe/WebLLM, measured by M1b.
3. Small + heavily quantized bases erode instruction nuance — the part only
   the M3 fine-tune fixes (bake behavior into weights, not the prompt).

## Grounding / constraints (verified 2026-07-11)

- All inference is in-browser; a fine-tuned model must ship in **three
  formats**: MLC (WebLLM), ONNX (Transformers.js v4), LiteRT `.task`
  (MediaPipe). None of the browser runtimes load LoRA adapters at runtime →
  the QLoRA adapter must be **merged into the base weights, then converted
  per format** (MLC: `mlc_llm convert_weight`; ONNX: optimum/ai-edge export;
  LiteRT: `ai-edge-torch`). Hosting: HF under an account Sharang controls.
- **Training data must be synthetic/curated — NEVER real user journal
  content.** The local-only rule is absolute; nothing a tester ever typed can
  enter a dataset.
- Existing assets to reuse: the 4-mode eval harness + release-gate floors
  (README), `EvalPanel.tsx`, `docs/evals/` history, the Day-30/32 revert
  precedents. The release gate applies unchanged to any fine-tuned model:
  below-floor = do not ship.
- **Relationship to public-release:** BLOCKS the soft launch (Sharang
  2026-07-12 — flipped from the parallel-track default). Public-release
  R1e/R2 still proceed in parallel; R4 and LICENSE decisions are deferred
  until the quality bar is met.

## Increments

| id | what | status |
|---|---|---|
| M0 | Cheap echo mitigations now: prompt-level (cap the echo to a few words, forbid restating the full entry) + engine sampling parity (MediaPipe/Transformers.js vs WebLLM). Touches `src/prompts/` → **full release-gate eval required in the PR** | DONE (PR #89) — prompt half REVERTED (gate fail); engine parity shipped |
| M1 | Conversational-quality eval: echo/repetition metric (n-gram overlap between entry and reply opening), naturalness rubric, multi-turn cases; baseline all 3 backends on `vite preview` | harness DONE + Gemma 4 E2B headless baseline recorded (PR #92); browser-backend baseline (WebLLM/MediaPipe) still open → M1b |
| M2 | Dataset: spec + ~1–5k synthetic journaling dialogues (4 modes, safety cases mirrored from the gate floors, anti-echo exemplars), hand-curated sample review | spec DONE (M2a, PR #91); generation PAUSED at 357/2000 — Haiku pilot done 2026-07-17, awaiting Sharang's §6 tone veto before the full spend |
| M3 | QLoRA fine-tune: 4-bit Gemma 4 E2B + LoRA adapter (unsloth/PEFT on Colab), merge adapter → fp16 checkpoint on HF (Sharangp) | setup COMPLETE 2026-07-12; notebook WRITTEN 2026-07-16 (M3a, PR #98) — waits only on the M2 dataset (M2c, generating), then Sharang runs it |
| M4 | Eval the merged model: M1 harness + full release-gate floors; below-floor = do not ship (Day-30/32 precedent) | after M3 |
| M5 | Convert + deploy: merged → MLC / ONNX / LiteRT, host on HF, swap model refs in-app in one PR carrying the M4 numbers | after M4 |

## Task queue

- [x] 2026-07-11 · **M0 — Echo mitigation in prompts + engine sampling
  parity** (DONE 2026-07-13, PR #89 — prompt half REVERTED on a 4-floor
  release-gate FAIL, engine parity shipped; full numbers + lesson in Ledger
  and `docs/eval-runs/2026-07-13-m0-gate/NOTE.md`. Do NOT retry prompt-side
  echo caps — anti-echo belongs to M2/M3.)
- [x] 2026-07-11 · **M1 — Echo metric + conversational baseline** (DONE
  2026-07-14 as the honest smaller version, PR #92 — harness + rubric +
  three 10-turn scenarios shipped; headless Gemma 4 E2B baseline in the
  table below; WebLLM/MediaPipe browser baselines NOT run → M1b. See
  Ledger.)
- [x] 2026-07-11 · **M2a — Dataset spec (doc-only)** (DONE 2026-07-14, PR
  #91 — `docs/model-quality/DATASET.md`; see Ledger. Unblocks M2b.)
- [x] 2026-07-16 · **M1b — Browser-backend baseline (WebLLM Gemma 2 2B +
  MediaPipe E2B)** (DONE 2026-07-16, PR #95 + en-route P1 fix PR #94 —
  both baseline rows filled in the table below; WebLLM-removal
  recommendation recorded in Decisions and escalated to Blocked on
  Sharang. Full detail in Ledger.)
- [x] 2026-07-16 · **M1c — Strip leaked Gemma turn markers from MediaPipe
  replies** (DONE 2026-07-16, PR #96 — decided stop-sequence approach
  implemented as `TurnMarkerStreamFilter`; see Ledger.)
- [x] 2026-07-16 · **M2b — Dataset generator script (mock-teacher first)**
  (DONE 2026-07-16, PR #97 — see Ledger.)
- [x] 2026-07-16 · **M3a — Colab training notebook (artifact-only; Sharang
  executes)** (DONE 2026-07-16, PR #98 — see Ledger.)
- [x] 2026-07-17 · **M2d — Land the working-tree API-teacher modes as a
  PR** (DONE 2026-07-17, execute — see Ledger. Diff verified key-free
  (`loadApiKey` reads env/`.env.local` only, never prints); no live
  session mid-edit; suite 1033 green; `status` verified: 85/2000.)
- [ ] 2026-07-16 · **M2c — Generate the dataset (hybrid teacher)**
  (pilot DONE 2026-07-17, execute: the 500-card Haiku pilot ran via the
  Batches API (`msgbatch_01XyaopfpryubM5XFvrMAv8i`) — **272/500 accepted
  first-attempt (54%)**, dataset at **357/2000** (fw 135 / ci 94 / tr 70 /
  gr 58, §3 shares holding); 228 rejects stay pending in the deck (top
  reasons in last-300 telemetry: shape 195, callback 71, template-smell 58
  — a retry pass recovers them). Stratified 37-dialogue review sample
  (100% of safety mirrors) committed at
  `docs/model-quality/samples/2026-07-17-pilot-500-review.md`.
  **GENERATION IS NOW PAUSED per the task's pilot-first rule** — waiting
  on Sharang's §6 tone veto before the remaining ~1,400 cards + retries.)
  Remaining after his go: fire the rest of the deck via `batch`, retry
  rejects, loop-authored batches per run via `cards/ingest`. → Verify:
  `status` shows counts advancing with §3 shares holding; §6 hand-review
  protocol (10%/slice, 100% of safety mirror) before the HF upload.

- [ ] 2026-07-18 · **M2e — Teacher-prompt fixes from the pilot review**:
  in `src/utils/m2DatasetGenerator.ts`, add variety pressure against the
  crystallizing house style (em-dash "X — reframe" openers, "There it is"
  / "That's real" validators, question-ending every turn — rotate
  per-card stylistic constraints the way RESOLUTION_STYLES already
  rotates closings), add diagnosis-adjacent vocabulary ("diagnosable",
  "clinically") to the template-smell/filter list (tr-0296 leaked "that's
  actually diagnosable stress response"), and add a pronoun-neutrality
  instruction for unspecified names (pilot model guessed "her" for
  "Jordan"). Also consider widening the deck's topic/planted-detail pools
  (Harlow/pottery/transfer/3am recur across many dialogues). → Verify:
  prompt-contract tests updated; suite green; PR merged. **Must land
  before the full ~1,400-card run.**
- [ ] 2026-07-18 · **M4a — GGUF + llama-server harness bridge (proposed
  2026-07-18, interactive session)**: convert
  `Sharangp/quietnote-m3-gemma4-e2b-merged` to GGUF q4 (llama.cpp
  `convert_hf_to_gguf.py` — verify gemma4 arch support first), run local
  `llama-server`, and add an endpoint mode to
  `scripts/run-m1-baseline.ts`/`run-eval.ts` (OpenAI-compatible
  completion adapter behind a `--endpoint` flag; same managed-strategy
  driver, same rubric). Then run the full M1 instrument + release-gate
  eval against the pilot model and record the numbers vs the floors —
  an honest 4-bit proxy while ONNX is upstream-blocked. → Verify:
  baseline reports under `docs/eval-runs/`, numbers in this doc.
- [ ] 2026-07-18 · **M5a — LiteRT conversion + dev-only model override
  (proposed 2026-07-18, interactive session)**: ai-edge-torch conversion
  of the merged checkpoint → `.task`, served from localhost; add a
  dev-only override (e.g. localStorage `quietnote-model-url-override`,
  dev builds only, never shipped UI) so the MediaPipe backend loads it —
  the first real **in-app** test of the fine-tune, and M5's LiteRT
  artifact. Research ai-edge-torch's gemma-4 recipe first; Colab cells
  or a committed script, Sharang executes GPU steps if needed. → Verify:
  real exchange in the app on `npm run dev` against the fine-tuned
  `.task`, screenshot.

## M1 baseline (2026-07-14, headless — `npm run eval:m1`)

Model: **Gemma 4 E2B ONNX q4f16 via Node onnxruntime-node CPU** — the same
model+quantization Transformers.js serves in the app, generation defaults
mirrored from `transformersjs-engine.ts` (incl. `repetition_penalty: 1.3`),
scenarios run through the C1 driver on the **managed** strategy (the real
app send path: recap + trim). Raw outputs + full transcripts:
`docs/eval-runs/2026-07-14-m1-baseline/`.

| instrument | result |
|---|---|
| Echo cases (10 single-turn, all modes) | **10/10 no-echo passes; mean overlap 0.11** (threshold 0.35) |
| qb-freewrite-arc (10 turns) | 82/86 = **95%**, zero-critical: none, trims: none → rubric PASS |
| qb-checkin-days (10 turns) | 79/86 = **92%**, zero-critical: none, trims: none → rubric PASS |
| qb-thoughtrecord-arc (10 turns) | 80/84 = **95%**, zero-critical: none, trims: none → rubric PASS |
| Context budget | **10 turns never trimmed** under managed strategy (recap fired; est. history well under budget) — the 10-turn bar fits `MODEL_CONTEXT_LIMIT` 4096 |
| WebLLM Gemma 2 2B | **run 2026-07-16 (M1b)** — see the browser baseline below |
| MediaPipe Gemma 4 E2B LiteRT | **run 2026-07-16 (M1b)** — see the browser baseline below |

## M1b browser baseline (2026-07-16, in-browser — EvalPanel "Run M1 baseline" on `npm run dev` + `?eval`, real engines, app send-path options: temperature 0.6, maxTokens 200, repetitionPenalty 1.3)

Full reports + transcripts: `docs/eval-runs/2026-07-16-m1b-webllm/` and
`docs/eval-runs/2026-07-16-m1b-mediapipe/`.

| instrument | WebLLM `gemma-2-2b-it-q4f32_1-MLC` | MediaPipe `gemma-4-e2b` LiteRT |
|---|---|---|
| Echo cases (10 single-turn) | **10/10 no-echo, mean overlap 0.03** | **7/10 no-echo, mean overlap 0.22** — incl. one hard fail (echo-fw-3 overlap **0.84**, near-verbatim mirror: *"Snapped at your best friend Jordan over something tiny at lunch, and now the silence between you…"* — exactly the 2026-07-11 live failure) |
| qb-freewrite-arc | 75/86 = 87% → rubric PASS | 81/86 = 94% → rubric PASS |
| qb-checkin-days | 73/86 = **84.9% → rubric FAIL** | 79/86 = 92% → rubric PASS |
| qb-thoughtrecord-arc | 72/84 = 86% → rubric PASS | 75/84 = 89% → rubric PASS |
| Trims | none (10 turns fit) | none (10 turns fit) |

**Human read (the part the deterministic rubric under-catches):**

- **WebLLM Gemma 2 2B degrades into verbatim self-repetition loops by
  mid-conversation.** In qb-checkin-days it replies with the *identical*
  sentence ("I'm glad you had some time to connect with Dan… how did your
  day go overall?") at turns 3, 4, 6, 8 and 9 regardless of what the user
  wrote (including at "I submitted it. It's done." and "How do I not end
  up here again next time?"); in qb-thoughtrecord-arc turns 5–9 are one
  frozen reply. Its clean echo number is real but moot — the model stops
  listening after ~5 turns, which is fatal for the 10-turn quality bar.
  The rubric's continuity/support heuristics score these loops 2/2
  (they contain "you" and "?"), so read the transcripts, not just the %.
- **MediaPipe E2B is the opposite failure**: genuinely engaged multi-turn
  (real Harlow/Dan/Priya callbacks, no loops — its LiteRT runtime carries
  no KV/sampling state between calls), but with NO repetition penalty it
  mirrors detail-rich entries back — the live parroting Sharang saw is
  confirmed to live here (and would also afflict single-turn openers on
  any backend without the penalty).
- **MediaPipe leaks raw turn markers into user-visible replies**
  (`<end_of_turn>`, malformed `<end{turn>`) — filed as M1c below.

**How to read this (do NOT over-claim):** the headless E2B path PASSES the
deterministic rubric — but the quality bar stays OPEN on three grounds:
(1) the rubric's continuity/support dims are string heuristics; on a human
read the transcripts are coherent with real callbacks but stiff, formal,
interview-like — not yet "a warm journal with a therapy aspect";
(2) the parroting Sharang saw live was on a browser backend (MediaPipe has
NO repetition penalty), neither of which is measured yet → M1b;
(3) by definition the bar is met only when **M4 clears it on the
fine-tuned model** with gate floors intact. Implication: the M2 dataset
tilts from raw anti-echo toward **warmth/register + personalization
depth** — `DATASET.md` §1 already orders it that way.

## Ledger

| date | item | PR | outcome |
|---|---|---|---|
| 2026-07-17 | M2c — 500-card Haiku pilot (Batches API) | #101 | Pilot ran per the 2026-07-17 teacher decision: `batch --count 500 --model claude-haiku-4-5` (batch `msgbatch_01XyaopfpryubM5XFvrMAv8i`, 50% batch pricing, ~50 min wall clock, 500/500 succeeded at the API level). Filters accepted **272/500 first-attempt (54%)** — well above the compare run's 8/15, consistent with the M2d prompt hardening helping; dataset now **357/2000** (fw 135 / ci 94 / tr 70 / gr 58 — §3 shares holding). 228 rejected cards remain pending in the deck (one-attempt-per-card rule; recoverable by a retry pass). Reject telemetry (last 300 rows): shape 195, callback 71, template-smell 58, format 30, echo 20, teacher-error 17, banned-opener 10 — shape is still the dominant loss even after hardening. Stratified 37-dialogue sample (all safety mirrors + strided slices) committed for Sharang's §6 tone veto: `docs/model-quality/samples/2026-07-17-pilot-500-review.md`. **Generation PAUSED pending his go** (pilot-first rule); no further API spend this run. Loop-authored batch deliberately skipped this run — the pilot had claimed the next 500 deck ids at submit time, so hand-authoring concurrently would have collided. |
| 2026-07-17 | M2d — API-teacher modes landed from the working tree | #100 | The ~415 uncommitted lines committed as their own PR, verbatim (no rewrites — already exercised for real by the 2026-07-17 compare run and the live rejects telemetry). `scripts/m2-loop-teacher.ts` gains `api` (live calls, filter-reason-fed retries), `batch` (Messages Batches API, 50% off, one attempt per card, polls to completion, re-run retries pending), and `compare` (same cards through N models, single attempt, markdown report, never ingested) — all fulfilling the same fixed deck through the same `ingestBatch` filters as loop-authored batches. Core additions in `m2DatasetGenerator.ts`: `estimateMaxTokens` (scales output budget with userTurns — fixed 4096 was truncating long dialogues mid-JSON), teacher-prompt hardening from observed reject telemetry (exact object count + no-fences shape contract, concrete callback example instead of a meta-instruction, deterministic per-card closing-style assignment + explicit ban on the overused worry→childhood-fear→therapy arc, no-early-stop warning). Key hygiene verified: `loadApiKey` reads env/`.env.local` only, never prints; no key material in the diff. 10 new tests; suite 1033 green; `status` works (85/2000). |
| 2026-07-17 | M2c (in progress) — loop-teacher workflow + first authored batch | #99 | Sharang's interactive decisions recorded: teacher = HYBRID (loop authors exemplar batches on the subscription — no API spend; his funded key generates the volume, pilot-first). Shipped `scripts/m2-loop-teacher.ts` (deal cards / ingest / status / sample against a FIXED 2,000-card deck) + core additions (`buildM2Deck`, ratio-woven `interleaveDeck`, `ingestBatch` with dupe/unknown rejection; sampler flags now STRIDED so any deck prefix is representative — was front-loaded). First real batch authored by the loop: **24/24 accepted** across all modes/bands (5 safety mirrors, 8 callbacks, hard-anti-echo singles) — 1 initial reject (`tr-0281`: the loop mirrored "more of me, in whatever form" pronoun-swapped; overlap 0.35 caught it — the filters police the teacher too) rewritten and re-ingested. 12-dialogue review sample committed (`docs/model-quality/samples/2026-07-16-batch-001-review.md`) for Sharang's §6 tone veto. 3 new tests (deck stability, interleave coverage, ingest rejection taxonomy); suite 1026 green. Dataset file stays git-ignored (24/2000). |
| 2026-07-16 | M3a — Colab training notebook (artifact-only) | #98 | `notebooks/m3-qlora-gemma4-e2b.ipynb` (11 cells) generated by a new builder, `scripts/build-m3-notebook.ts`, which imports the REAL prompt constants from `src/prompts/systemPrompts.ts` and embeds them as a verbatim snapshot cell (byte-identity verified by the builder's validator; re-sync = re-run the builder — the notebook's markdown carries this rule). Notebook: config cell up top (`Sharangp/quietnote-m2-v1`, HF_TOKEN via `getpass` paste-in, T4-friendly hyperparams), unsloth-preferred / PEFT+bitsandbytes-fallback installs, dataset load + §2 schema check, rendering via `tokenizer.apply_chat_template` with system role (fold-into-first-user-turn fallback) exactly like `transformersjs-engine.ts`, checkin pinned to the evening variant per the eval convention, §7 tokenize-under-4096 assertion, responses-only masking (unsloth `train_on_responses_only` / TRL `DataCollatorForCompletionOnlyLM` on the Gemma turn markers), 5% eval split, adapter push + merge→fp16 `push_to_hub` (both private, Sharangp), final M4 handoff checklist cell with the exact gate floors. Validated by the builder's nbformat-4 checks AND `python -c "nbformat.validate(...)"` (OK, 11 cells). The loop never runs it — Sharang executes on Colab (standing M3 rule). Build green, 1023 tests. |
| 2026-07-16 | M2b — Dataset generator script (mock-teacher first) | #97 | Pipeline per `DATASET.md` §5, split as pure core (`src/utils/m2DatasetGenerator.ts` — seeded card sampler with largest-remainder allocation hitting §3 slice shares and §4 length mix exactly, ~35% callback / ~10% safety-mirror / ~10% hard-anti-echo flags; §1-contract teacher-prompt renderer; filters reusing `echoMetric.ts` overlap `< 0.35`, `TEMPLATE_SMELL_PHRASES` + `BANNED_OPENERS`, sentence/markdown/one-question format checks, callback-present ≥2 turns after the plant, safety referral vocab + `DOSE_ADVICE_BANS`; reject-and-regenerate loop with attempt salt + rejection telemetry) + thin CLI (`scripts/generate-m2-dataset.ts`, JSONL writer to git-ignored `datasets/`). Teacher behind `--teacher=anthropic\|mock`: mock = deterministic canned dialogues passing every filter (60-card sweep pinned in tests); anthropic = `@anthropic-ai/sdk` (devDependency) Messages call, default model `claude-sonnet-5` per §5's Sonnet-class decision, hard-exits without `ANTHROPIC_API_KEY` (M2c stays blocked on Sharang). Verified: `npx tsx scripts/generate-m2-dataset.ts --teacher=mock --count 20` → 20/20 accepted, shares 8/5/4/3, zero failed cards. 20 new tests (sampler shares/determinism, each filter, prompt render, e2e, regenerate telemetry); suite 1023 green; no API calls in the suite. |
| 2026-07-16 | M1c — Strip leaked Gemma turn markers from MediaPipe replies | #96 | Decided stop-sequence approach implemented verbatim as `TurnMarkerStreamFilter` in `mediapipe-engine.ts`: any occurrence of `<end` or `<start_of_turn` in the accumulated stream stops emission (catches every observed variant incl. malformed `<end{turn>`, `<end of turn>`); a chunk-final fragment that is still a strict marker prefix — plus preceding whitespace, so the stop point trims clean — is held back until the next chunk disambiguates, and flushed if benign at stream end. Also fixed a latent drain bug found en route: the generate loop checked `done` before draining, so chunks delivered in the same callback burst as `complete` were dropped. 12 new tests (all observed variants, cross-chunk + mid-marker splits, benign `<`, held-fragment flush, marker-only final chunk, generate() integration). Verified live: real MediaPipe exchange on `npm run dev` (model from Cache Storage), rendered reply contains no `<`-fragments (screenshot `docs/screenshots/2026-07-16/m1c-mediapipe-clean-reply.png`). Not gate-triggering (inference-engine file only, precedent #83/#94). Build green, 1003+ tests. |
| 2026-07-16 | M1b — Browser-backend baseline (WebLLM + MediaPipe) | #95 (+ #94 fix, #93 flake fix) | In-browser M1 runner shipped (`m1BrowserRunner.ts` packages the exact headless procedure — managed strategy, deflection guard, app send-path options — behind a "Run M1 baseline" EvalPanel section emitting one copyable markdown report; 5 tests). Both baselines recorded (tables above; reports + full transcripts under `docs/eval-runs/2026-07-16-m1b-*/`). Findings: WebLLM 10/10 no-echo but **verbatim self-repetition loops from ~turn 5** (checkin rubric FAIL 84.9%) → REMOVE recommendation in Decisions; MediaPipe engaged multi-turn, all scenarios rubric-pass, but 7/10 echo with one 0.84 near-verbatim mirror (the live 07-11 failure confirmed here) + leaks `<end_of_turn>` markers into replies → M1c proposed. **En-route P1: every MediaPipe send had failed since M0 (PR #89)** — `setOptions({temperature})` on first send rebuilds the session and loses the streamed model asset ("No model asset provided"); fixed in PR #94 (temperature baked at load, setOptions banned + regression-tested, real exchange verified). Also fixed a midnight-window test flake (PR #93) and removed a stale April worktree that vitest was double-collecting — **real suite size is 983 (now 989), not the 1383 previously reported**. |
| 2026-07-14 | M1 — Echo metric + conversational baseline (honest smaller version) | #92 | Harness shipped additively (`echoMetric.ts` n-gram overlap with pronoun folding + template-smell list; `echoEvalCases.ts` 10 cases; `qualityBarScenarios.ts` three 10-turn scenarios with planted details + fairness-tested callbacks; `qualityBarRubric.ts` 0–2 × 5 dims, pass = ≥85% + zero critical zeros; `EVAL_CASES`/floors untouched). Headless Gemma 4 E2B baseline via `npm run eval:m1` on the managed send path: 10/10 no-echo (mean overlap 0.11), scenarios 95%/92%/95% rubric PASS, zero trims in 10 turns. **Read the caveats in the baseline section — quality bar stays OPEN** (heuristic rubric; stiff register on human read; browser backends incl. the no-repetition-penalty MediaPipe unmeasured → M1b proposed; WebLLM-removal question still has no data). 33 new tests; 1383 green. |
| 2026-07-14 | M2a — Dataset spec (doc-only) | #91 | `docs/model-quality/DATASET.md` written per the updated task: JSONL schema (format-agnostic; Gemma turn rendering + real system prompt happen in the M3 notebook, responses-only masking), target ~2,000 dialogues (fw 40/ci 25/tr 20/gr 15), teacher = Claude via API from a local script with scenario cards, mechanical reject-and-regenerate filters reusing `echoMetric.ts` thresholds, safety mirror ~10% (crisis turns EXCLUDED — guards own that behavior), personalization exemplars as a first-class section (callbacks, throughline, register adaptation, cross-day memory), curation protocol (10%/slice hand review, 100% of safety mirror, ~20 exemplars quoted in the M2 PR for Sharang's tone veto), and the hard no-real-user-text rule with provenance re-check. Unblocks M2 generation. |
| 2026-07-13 | M0 — Echo mitigation + engine sampling parity | #89 | **Prompt half: NEGATIVE RESULT, reverted in the same PR** (Day-30/32 precedent). Full gate eval with `--referral-reprompt` ON (Gemma 4 E2B, headless runner) FAILED 4 floors: empathy 39/44 (≥43), specificity 55/60 (≥56), gratitude medical 15/16 (16/16), thoughtrecord medical 15/16 (16/16). Lesson (full detail `docs/eval-runs/2026-07-13-m0-gate/NOTE.md`): the "ONE detail in a few words" cap produces fragment openers that blow the 3–4-sentence format caps (4 of 5 specificity fails = "Too many sentences"), and the dose-echo leak ("ten milligrams…") survived anyway — prompt-side anti-echo can't fix a 2–4B quantized model; it's the fine-tune's job (M2/M3). Do not retry echo caps in prompts. **Engine half SHIPPED**: MediaPipe now applies `GenerateOptions.temperature` via `setOptions()` (previously discarded ALL options); documented its API has no repetition-penalty knob (LlmInferenceOptions = maxTokens/topK/temperature/randomSeed), so `repetitionPenalty` cannot reach that backend. Transformers.js already had per-call parity. 2 regression tests; 1348 green. |

## Blocked on Sharang

- **WebLLM removal — go/no-go** (added 2026-07-16): the M1b data is in and
  the loop's recommendation is **REMOVE** (see Decisions — Gemma 2 2B
  self-repetition loops from ~turn 5, checkin rubric FAIL, and the
  fine-tune targets E2B so it can never benefit). Per the 2026-07-12
  decision this needs Sharang's explicit go; if given, the planner queues
  it as its own increment (default-engine swap + download-size copy,
  README, R1b-matrix updates all reference WebLLM). Note the standing
  caveat: removal does NOT dissolve the unsupported-browser problem unless
  M5 picks a WASM-loadable quantization.
- ~~**M2c — teacher API key / cost approval**~~ **RESOLVED 2026-07-16
  (interactive):** Sharang chose the hybrid teacher (loop authors
  exemplar batches on the subscription; his funded `ANTHROPIC_API_KEY`
  generates the volume via the API, pilot-first). **Key confirmed present
  in `.env.local` 2026-07-17** — and the 500-card Haiku pilot has now RUN
  (272 accepted, dataset 357/2000; PR #101). **The ball is with Sharang:**
  review `docs/model-quality/samples/2026-07-17-pilot-500-review.md` (§6
  tone veto — if Haiku reads flat, the decided fallback is rerunning the
  pilot slice on Sonnet) and give the go for the remaining ~1,400 cards +
  reject retries. Generation stays paused until then.
- ~~**M3 setup**~~ **COMPLETE 2026-07-12 — M3 is fully unblocked** (waits
  only on M2 dataset + the training notebook). State for future runs:
  - **Compute:** Colab compute purchased and active on Sharang's Google
    account (2026-07-12). Budget rule: stay within the already-purchased
    units; never queue anything that requires buying more without asking
    Sharang. Sharang runs the notebook himself — the loop only writes it.
  - **HF hosting:** account **Sharangp**. Write token lives in git-ignored
    `.env.local` (repo root) as `HF_TOKEN` — verified 2026-07-12 via
    `whoami-v2`: fine-grained, `repo.write` scoped to Sharangp only. Never
    commit it, never print it, never expose it via a `VITE_`-prefixed name;
    Sharang pastes it into Colab at train time.
  - Base repo `google/gemma-4-E2B-it` is Apache 2.0 and appears ungated; if
    the notebook's first pull hits a terms gate anyway, Sharang accepts it
    on the Sharangp account.
