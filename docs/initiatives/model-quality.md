# Initiative: model-quality (QLoRA fine-tune + conversational eval)

**Created 2026-07-11 (interactive, Sharang).** Trigger: watching the R1d
verification exchange live, Sharang's verdict was that the model is "pretty
horrible" — the reply opened by restating his whole entry back pronoun-swapped
("I finally fixed a bug that had been bothering you all week and you feel
lighter than you have in days. …"). Direction from Sharang: **run QLoRA and
add an adapter** — train and test a model that is genuinely conversational
for these journaling use cases, and make sure it actually works well.

**Mission:** QuietNote's replies read like a warm, natural conversational
companion — no parroting the entry back, no template smell — proven by a
conversational-quality eval, achieved by QLoRA fine-tuning the base model,
**without regressing a single safety floor** from the release gate.

This initiative supersedes the README parked-list line about eval work *for
this initiative's scope only* (new conversational-quality eval dimensions are
in scope here per Sharang's 2026-07-11 instruction). Everything else in the
parked list stays parked.

## Why the model parrots the entry (diagnosed 2026-07-11)

1. **The prompt tells it to echo, and a 2–4B model over-complies.**
   `src/prompts/systemPrompts.ts` FIRST-LINE rule: "open by naming something
   concrete the user wrote … If you cannot find a concrete detail to name,
   restate one of their own phrases back to them", plus per-mode "Echo a
   concrete word or detail from what the user wrote". Frontier models take
   "a detail"; small quantized models mirror the whole entry. (Same family as
   the parked freewrite "dose-echo WATCH".)
2. **MediaPipe ignores all sampling options.** `MediaPipeEngine.generate()`
   discards `GenerateOptions` — the app's `repetitionPenalty: 1.3` (applied
   by WebLLM) never reaches it, and its API has no repetition penalty at all;
   temperature/topK are frozen at load time. Nothing discourages copying.
3. **Base models are small and heavily quantized** (2B q4f16 / E2B int4) —
   instruction-following nuance is exactly what quantization erodes. This is
   the part only fine-tuning can fix: bake the desired conversational
   behavior into the weights instead of asking for it in a 1.6k-token prompt.

## Grounding / constraints (verified 2026-07-11)

- All inference is in-browser; a fine-tuned model must ship in **three
  formats**: MLC (WebLLM), ONNX (Transformers.js v4), LiteRT `.task`
  (MediaPipe). None of the browser runtimes load LoRA adapters at runtime →
  the QLoRA adapter must be **merged into the base weights, then converted
  per format** (MLC: `mlc_llm convert_weight`; ONNX: optimum/ai-edge export;
  LiteRT: `ai-edge-torch`). Hosting: HF under an account Sharang controls.
- Base model candidates: **Gemma 4 E2B** (already the base for 2 of 3
  backends — one fine-tune covers Transformers.js + MediaPipe) or **Gemma 2
  2B** (the WebLLM default most users hit first). Decide with M1 baseline
  data on which backend real users will actually feel.
- **Training data must be synthetic/curated — NEVER real user journal
  content.** The local-only rule is absolute; nothing a tester ever typed can
  enter a dataset.
- Existing assets to reuse: the 4-mode eval harness + release-gate floors
  (README), `EvalPanel.tsx`, `docs/evals/` history, the Day-30/32 revert
  precedents. The release gate applies unchanged to any fine-tuned model:
  below-floor = do not ship.
- **Relationship to public-release:** parallel track, does NOT block the soft
  launch (current models + prompt mitigations ship first) — flip only if
  Sharang says the quality bar blocks release.

## Increments

| id | what | status |
|---|---|---|
| M0 | Cheap echo mitigations now: prompt-level (cap the echo to a few words, forbid restating the full entry) + engine sampling parity (MediaPipe/Transformers.js vs WebLLM). Touches `src/prompts/` → **full release-gate eval required in the PR** | queued |
| M1 | Conversational-quality eval: echo/repetition metric (n-gram overlap between entry and reply opening), naturalness rubric, multi-turn cases; baseline all 3 backends on `vite preview` | queued |
| M2 | Dataset: spec + ~1–5k synthetic journaling dialogues (4 modes, safety cases mirrored from the gate floors, anti-echo exemplars), hand-curated sample review | after M1 spec |
| M3 | QLoRA fine-tune: 4-bit base + LoRA adapter (unsloth/PEFT, Colab or rented GPU), merge adapter → fp16 checkpoint on HF | gated on Sharang (GPU budget + HF hosting) |
| M4 | Eval the merged model: M1 harness + full release-gate floors; below-floor = do not ship (Day-30/32 precedent) | after M3 |
| M5 | Convert + deploy: merged → MLC / ONNX / LiteRT, host on HF, swap model refs in-app in one PR carrying the M4 numbers | after M4 |

## Task queue

- [ ] 2026-07-11 · **M0 — Echo mitigation in prompts + engine sampling
  parity**: in `src/prompts/systemPrompts.ts`, tighten the FIRST-LINE rule and
  per-mode "Echo a concrete word or detail" lines so the echo is explicitly
  capped ("name ONE detail in at most a few words — never restate their
  sentences back") and add a negative example of full-entry mirroring; in
  `src/inference/mediapipe-engine.ts` / `transformersjs-engine.ts`, wire
  whatever sampling knobs each API actually has (temperature/topK per call if
  supported; document that MediaPipe has no repetition penalty). **This
  touches `src/prompts/` → run the full 4-mode eval read with
  `--referral-reprompt` ON and put the numbers vs the gate floors in the PR
  body; below-floor = do not merge.** → Verify: eval numbers at/above floors
  AND a before/after exchange on `vite preview` showing the reply no longer
  opens with the mirrored entry (screenshots).
- [ ] 2026-07-11 · **M1 — Echo metric + conversational baseline**: add an
  echo/repetition dimension to the eval harness (score = max n-gram overlap
  between the user entry and the first sentence of the reply, normalized;
  plus a "template smell" check for stock phrases), 8–12 cases across the 4
  modes; run it against all 3 backends on the current models and record the
  baseline table in this doc. New dimension is additive — do not touch
  existing cases/floors. → Verify: baseline table committed here, harness runs
  green in CI/test suite.
- [ ] 2026-07-11 · **M2a — Dataset spec (doc-only)**: write
  `docs/model-quality/DATASET.md` — schema (multi-turn, 4 modes, Gemma turn
  format), target size, generation plan (which teacher model, prompt
  templates), safety-case coverage mirrored from the gate floors, anti-echo
  exemplar design, curation/review protocol, and the hard rule that no real
  user text ever enters the set. → Verify: doc reviewed in PR; unblocks M2
  generation.

## Ledger

| date | item | PR | outcome |
|---|---|---|---|

## Blocked on Sharang

- **M3 go-ahead**: GPU budget (Colab Pro / rented A100 hours), which HF
  account/org hosts the merged weights, and base-model choice sign-off
  (Gemma 4 E2B vs Gemma 2 2B) once M1 baseline data exists.
- **Release coupling**: whether model-quality blocks the soft launch
  (default: it does not — M0 prompt mitigation ships first, fine-tune lands
  as an upgrade).
