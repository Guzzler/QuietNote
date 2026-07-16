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
| M2 | Dataset: spec + ~1–5k synthetic journaling dialogues (4 modes, safety cases mirrored from the gate floors, anti-echo exemplars), hand-curated sample review | spec DONE (M2a, PR #91) — generation open |
| M3 | QLoRA fine-tune: 4-bit Gemma 4 E2B + LoRA adapter (unsloth/PEFT on Colab), merge adapter → fp16 checkpoint on HF (Sharangp) | setup COMPLETE 2026-07-12 (compute + HF token verified); waits on M2 dataset + notebook |
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
  MediaPipe E2B)** (DONE 2026-07-16, PR #95 — both baselines recorded in
  the table below; run surfaced and fixed a P1 en route: **every MediaPipe
  send had been broken since M0** (PR #89's `setOptions` call rebuilds the
  session and loses the streamed model asset → "No model asset provided"),
  fixed in PR #94 before the baseline could run. WebLLM-removal
  recommendation recorded in Decisions. See Ledger.)
  (confirmed from execute's 2026-07-14 proposal;
  RE-SCOPED after grounding: `EvalPanel.tsx:36-37` renders only when
  `import.meta.env.DEV` AND a `?eval` query param are present, so the
  panel does NOT exist on `vite preview` — run on the dev server instead;
  engine/model/sampling behavior is identical for what M1b measures):
  add a dev-only "Quality bar (M1)" section to
  `src/components/EvalPanel.tsx` that runs `ECHO_EVAL_CASES`
  (`src/utils/echoEvalCases.ts`) and the three `QUALITY_BAR_SCENARIOS`
  through the same managed send path the headless runner uses, scores with
  `qualityBarRubric.ts`, and extends the existing copy-markdown affordance
  to emit the same transcript/rubric markdown as `npm run eval:m1`. Run
  per backend on `npm run dev` + `?eval` (switch engine in Settings,
  reload, run): WebLLM Gemma 2 2B, then MediaPipe Gemma 4 E2B LiteRT.
  Long inference runs — budget a dedicated run per backend; per-scenario
  abort/rerun is acceptable. → Verify: both open rows in the M1 baseline
  table below filled; transcripts committed under
  `docs/eval-runs/<run-date>-m1b-webllm/` and `…-m1b-mediapipe/`;
  WebLLM-removal recommendation (keep/remove, with numbers) recorded in
  Decisions for Sharang.
- [ ] PROPOSED 2026-07-16 (execute-filed, planner to confirm/re-scope) ·
  **M1c — Strip leaked Gemma turn markers from MediaPipe replies**: the
  M1b MediaPipe transcripts show raw `<end_of_turn>` and malformed
  `<end{turn>` markers reaching user-visible reply text (e.g.
  qb-checkin-days turns 3–5 in
  `docs/eval-runs/2026-07-16-m1b-mediapipe/report.md`) — the LiteRT path
  streams the stop token instead of consuming it. Plan: filter turn-marker
  fragments from the streamed chunks in
  `src/inference/mediapipe-engine.ts#generate` (careful: markers can split
  across chunk boundaries), regression test with marker-bearing streams.
  → Verify: unit tests + a real MediaPipe exchange on the dev server whose
  reply contains no `<`-marker fragments.
- [ ] 2026-07-16 · **M2b — Dataset generator script (mock-teacher
  first)**: write `scripts/generate-m2-dataset.ts` per `DATASET.md` §5 —
  scenario-card sampler (mode/topic/persona/planted-details/arc/length
  honoring the §3 slice shares and §4 composition), teacher prompt
  template rendering the §1 behavior contract + card, mechanical
  reject-and-regenerate filters reusing `echoMetric.ts`
  (`maxNgramOverlap < 0.35`, template-smell/banned openers,
  sentence-count + no-markdown, callback-present, safety-mirror referral
  vocab + dose/advice bans), §2-schema JSONL writer, and rejection
  telemetry. Teacher call sits behind `--teacher=anthropic|mock`;
  `--teacher=mock` (deterministic canned dialogues) is what tests and
  this PR exercise — **no API calls in the suite; the real batch is M2c,
  blocked on Sharang (see below)**. → Verify:
  `npx tsx scripts/generate-m2-dataset.ts --teacher=mock --count 20`
  emits schema-valid records with correct slice shares; unit tests cover
  the card sampler and each filter; suite green.
- [ ] 2026-07-16 · **M3a — Colab training notebook (artifact-only; Sharang
  executes)**: write `notebooks/m3-qlora-gemma4-e2b.ipynb` — 4-bit QLoRA
  on `google/gemma-4-E2B-it` (unsloth preferred, PEFT+bitsandbytes
  fallback; T4/A100-friendly), config cell up top (HF dataset repo id
  `Sharangp/quietnote-m2-v1` + HF_TOKEN paste-in), renders Gemma turn
  format with the real app system prompt prepended (committed snapshot
  cell with a re-sync note against `src/prompts/systemPrompts.ts`),
  responses-only loss masking, train/eval split, merge adapter → fp16 →
  `push_to_hub` under Sharangp, final cell printing the M4 handoff
  checklist. The loop writes it, never runs it (standing M3 rule). →
  Verify: notebook is nbformat-valid (validation script in the PR),
  cells reviewed in the PR body.

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
| 2026-07-16 | M1b — Browser-backend baseline (WebLLM + MediaPipe) | #95 (+ #94 fix, #93 flake fix) | In-browser M1 runner shipped (`m1BrowserRunner.ts` packages the exact headless procedure — managed strategy, deflection guard, app send-path options — behind a "Run M1 baseline" EvalPanel section emitting one copyable markdown report; 5 tests). Both baselines recorded (tables above; reports + full transcripts under `docs/eval-runs/2026-07-16-m1b-*/`). Findings: WebLLM 10/10 no-echo but **verbatim self-repetition loops from ~turn 5** (checkin rubric FAIL 84.9%) → REMOVE recommendation in Decisions; MediaPipe engaged multi-turn, all scenarios rubric-pass, but 7/10 echo with one 0.84 near-verbatim mirror (the live 07-11 failure confirmed here) + leaks `<end_of_turn>` markers into replies → M1c proposed. **En-route P1: every MediaPipe send had failed since M0 (PR #89)** — `setOptions({temperature})` on first send rebuilds the session and loses the streamed model asset ("No model asset provided"); fixed in PR #94 (temperature baked at load, setOptions banned + regression-tested, real exchange verified). Also fixed a midnight-window test flake (PR #93) and removed a stale April worktree that vitest was double-collecting — **real suite size is 983 (now 989), not the 1383 previously reported**. |
| 2026-07-14 | M1 — Echo metric + conversational baseline (honest smaller version) | #92 | Harness shipped additively (`echoMetric.ts` n-gram overlap with pronoun folding + template-smell list; `echoEvalCases.ts` 10 cases; `qualityBarScenarios.ts` three 10-turn scenarios with planted details + fairness-tested callbacks; `qualityBarRubric.ts` 0–2 × 5 dims, pass = ≥85% + zero critical zeros; `EVAL_CASES`/floors untouched). Headless Gemma 4 E2B baseline via `npm run eval:m1` on the managed send path: 10/10 no-echo (mean overlap 0.11), scenarios 95%/92%/95% rubric PASS, zero trims in 10 turns. **Read the caveats in the baseline section — quality bar stays OPEN** (heuristic rubric; stiff register on human read; browser backends incl. the no-repetition-penalty MediaPipe unmeasured → M1b proposed; WebLLM-removal question still has no data). 33 new tests; 1383 green. |
| 2026-07-14 | M2a — Dataset spec (doc-only) | #91 | `docs/model-quality/DATASET.md` written per the updated task: JSONL schema (format-agnostic; Gemma turn rendering + real system prompt happen in the M3 notebook, responses-only masking), target ~2,000 dialogues (fw 40/ci 25/tr 20/gr 15), teacher = Claude via API from a local script with scenario cards, mechanical reject-and-regenerate filters reusing `echoMetric.ts` thresholds, safety mirror ~10% (crisis turns EXCLUDED — guards own that behavior), personalization exemplars as a first-class section (callbacks, throughline, register adaptation, cross-day memory), curation protocol (10%/slice hand review, 100% of safety mirror, ~20 exemplars quoted in the M2 PR for Sharang's tone veto), and the hard no-real-user-text rule with provenance re-check. Unblocks M2 generation. |
| 2026-07-13 | M0 — Echo mitigation + engine sampling parity | #89 | **Prompt half: NEGATIVE RESULT, reverted in the same PR** (Day-30/32 precedent). Full gate eval with `--referral-reprompt` ON (Gemma 4 E2B, headless runner) FAILED 4 floors: empathy 39/44 (≥43), specificity 55/60 (≥56), gratitude medical 15/16 (16/16), thoughtrecord medical 15/16 (16/16). Lesson (full detail `docs/eval-runs/2026-07-13-m0-gate/NOTE.md`): the "ONE detail in a few words" cap produces fragment openers that blow the 3–4-sentence format caps (4 of 5 specificity fails = "Too many sentences"), and the dose-echo leak ("ten milligrams…") survived anyway — prompt-side anti-echo can't fix a 2–4B quantized model; it's the fine-tune's job (M2/M3). Do not retry echo caps in prompts. **Engine half SHIPPED**: MediaPipe now applies `GenerateOptions.temperature` via `setOptions()` (previously discarded ALL options); documented its API has no repetition-penalty knob (LlmInferenceOptions = maxTokens/topK/temperature/randomSeed), so `repetitionPenalty` cannot reach that backend. Transformers.js already had per-call parity. 2 regression tests; 1348 green. |

## Blocked on Sharang

- **M2c — teacher API key / cost approval for the real dataset batch**
  (added 2026-07-16): `DATASET.md` §5 names Claude via API as the teacher;
  `.env.local` today holds only `HF_TOKEN` — there is no
  `ANTHROPIC_API_KEY`. Before M2c (generating the ~2,000-dialogue set +
  rejects) can run, Sharang either adds `ANTHROPIC_API_KEY` to
  `.env.local` (rough order: low tens of dollars on a Sonnet-class
  teacher) or picks the §5 open-weights fallback. M2b's `--teacher=mock`
  mode keeps the whole pipeline buildable and tested meanwhile — the key
  is the only missing piece.
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
