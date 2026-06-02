# 2026-06-01 — Node-executable critic runner + system-prompt hoist

## Summary

Unblocked the EVAL critic loop after a 3-day stall. The loop had been running
on scaffolding, not data: real model output was captured exactly once (Day 1,
2026-05-28) and the 2026-05-29 / 2026-05-30 / 2026-05-31 scheduled slots each
shipped harness code while measuring nothing, because every inference backend
in the app is browser-bound (WebGPU/WASM) and the scheduled slot is headless.

This change adds a Node-executable inference path that reuses the
already-platform-agnostic `runEvalSuite` core, so every future critic day is
`npm run eval` in the same headless slot — no browser, no WebGPU, no
`Cache.add` blocker.

## What was changed and why

### `src/prompts/systemPrompts.ts` (new)
Verbatim hoist of the 5 mode prompts (free-write, gratitude, check-in
morning/evening, thought record) from `src/App.tsx`. The text is byte-identical
to the originals — no wording change. Exports:
- `getSystemInstruction(mode, contextBlock?, personalityDirective?)` — used by `App.tsx`
- `getBaseSystemInstruction(mode, { morning })` — used by the Node runner
  (pins the morning/evening Check-in variant for reproducible runs)
- The 5 individual prompt constants

Why hoist: both the React app and the Node runner now import the **same**
strings. Without the hoist, the runner would need its own copy that could
silently drift out of sync.

### `src/App.tsx`
Imports `getSystemInstruction` from the new module; the inline prompt
constants, local `isMorning`, and local `getSystemInstruction` are removed.
Call sites are unchanged.

### `scripts/run-eval.ts` (new)
Node runner that:
1. Loads `onnx-community/gemma-4-E2B-it-ONNX` (same model as
   [src/inference/transformersjs-engine.ts:16](../../src/inference/transformersjs-engine.ts#L16))
   via `@huggingface/transformers` + `onnxruntime-node` (CPU).
2. Implements `generate(messages)` by applying the tokenizer chat template,
   calling `model.generate` with the **same gen params** as the browser
   engine (`dtype: q4f16`, `max_new_tokens: 200`, `temperature: 0.6`,
   `repetition_penalty: 1.3`, `do_sample: true`), then slicing prompt tokens
   off the output and decoding.
3. Imports `runEvalSuite` + `reportToMarkdown` from
   `src/utils/evalDriver.ts` and `EVAL_CASES` from `src/utils/evalRunner.ts`
   **unchanged**, runs each of the 4 modes, and writes:
   - `docs/eval-runs/YYYY-MM-DD/{freewrite-fullsuite, gratitude, checkin, thoughtrecord}.md`
   - `docs/eval-runs/YYYY-MM-DD/summary.json`

Flags:
- `--limit=N` — first N cases overall (smoke)
- `--per-dim=N` — first N cases per dimension (best coverage)
- `--mode=freewrite|gratitude|checkin|thoughtrecord` — single mode

### `package.json`
Adds `tsx` + `onnxruntime-node` devDeps and three scripts:
- `npm run eval` — full per-mode suite
- `npm run eval:smoke` — `--limit=5` sanity run

### `src/prompts/__tests__/systemPrompts.test.ts` (new)
Guards the runner's prompt input — asserts every mode returns a non-empty
string containing the 2026-05-30 MEDICAL rule sentinel
(`"MEDICAL / HEALTH / MEDICATION RULE"`) and that the 5 prompt constants
still match their canonical marker phrases. Prevents a future hoist or
edit from silently dropping a rule the runner is meant to measure.

## Technical details

### Why Transformers.js (not WebLLM or MediaPipe)
WebLLM and MediaPipe are WebGPU-only — no Node path. Transformers.js v4
runs in both browser (WebGPU/WASM) and Node (`onnxruntime-node` CPU), and
it's the same library used for the Day 1 critic report. Matching the
backend keeps 2026-06-01 numbers directly comparable to 2026-05-28.

### Why CPU is acceptable here
The runner is for daily critic reports, not interactive use. ~20–25 s per
case on CPU is fine for an overnight headless slot. The KV-cache issues
(`Cache.add UnknownError`, `VectorInt` errors) that plague the browser
backends don't apply here — each `model.generate` call is stateless, and
`runEvalSuite` sends a fresh message array per case.

### Decode bug found during smoke
Initial `out[0].slice(inputIdsLen)` returned a Tensor that
`tokenizer.decode` couldn't accept (`"Expected tensor to have 1-2
dimensions, got 0"`). Fix: call `out.tolist()` first to get a plain JS
array, then `.slice()` + `decode`. After the fix, smoke
(`--limit=3 --mode=freewrite`) returned 3/3 PASS with real model text.

## Tests written
`src/prompts/__tests__/systemPrompts.test.ts` — 5 cases:
1. Every mode returns a non-empty string (morning + evening)
2. Every mode contains `MEDICAL / HEALTH / MEDICATION RULE` (sentinel)
3. The 5 prompt constants contain their canonical marker phrases
4. `getSystemInstruction` appends context block when provided
5. `getSystemInstruction` returns base when no context/personality

All 982 vitest cases pass (was 977; +5 new).

## Constraints honored (per 2026-06-01 plan)

- ✅ **Freeze on harness expansion** — `git diff origin/main -- src/utils/evalRunner.ts src/utils/evalDriver.ts` is empty
- ✅ No engine, guardrail, or crisis-detection edits
- ✅ Prompt hoist is byte-identical — no wording drift
- ✅ Backend matches Day 1 (Transformers.js Gemma 4 E2B) for direct comparability
- ✅ Smoke gate executed before scaling

## Next steps
1. **First measurement of the 2026-05-30 MEDICAL tune** — the partial
   `--per-dim=2` run kicked off in the same slot will write
   `docs/eval-runs/2026-06-02/*.md` once finished; the critic report
   `docs/critic-reports/2026-06-01.md` and the 4 north-star rows for
   2026-06-01 will follow as a separate commit on this branch (or as
   tomorrow's planning input if the slot doesn't quite finish in time).
2. **Register `quietnote-critic`** as a pure `node` cron — no longer a
   browser-automation task. Still human-only to set up.
3. **Multi-turn echo / structural preamble fix** for Fundamental Problem #2
   — postponed until daily critic data flows.

## PR
[#47](https://github.com/Guzzler/QuietNote/pull/47) — branch `eval/2026-06-01-node-runner`.
