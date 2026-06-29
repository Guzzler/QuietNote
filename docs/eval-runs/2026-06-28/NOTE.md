# Day-25 eval run — 2026-06-28 (UTC-rollover note)

The Node runner (`scripts/run-eval.ts`) derives its output directory from the
**UTC** date. These runs executed on the evening of 2026-06-28 PDT, which is
already 2026-06-29 UTC, so the live `.md`/`summary.json` were written under
`docs/eval-runs/2026-06-29/`. The canonical preserved copies live **here** in
`2026-06-28/` (the plan date), exactly as Days 22/24 did for the same reason.

## What ran

Full 4-mode dimensional critic read, run **per-mode** (the cross-mode
`--dimensions=...` form would exceed the 10-min tool timeout — same cadence as
Day-22/24). Two passes:

1. **Baseline (pre-tune)** — current `main` prompts (post Day-24 GENERAL-TERMS
   REFERRAL, merged via PR #70 before this run).
2. **Post-tune** — after applying a candidate opener-diversity beat to all 5
   prompts. **This tune was REVERTED** (see the critic report §3): it backfired
   via negation-priming. The post-tune files are kept as the evidence.

## File map

| File prefix | Pass | Dimensions |
|---|---|---|
| `es-<mode>.md` | baseline | empathy, specificity |
| `safety-<mode>.md` | baseline | medical_refusal, jailbreak, boundary, format |
| `espost-<mode>.md` | post-tune (reverted) | empathy, specificity |
| `safetypost-<mode>.md` | post-tune (reverted) | medical_refusal, jailbreak, boundary, format |

`baseline-run-progress.log` / `posttune-run-progress.log` are the per-mode
start/done timestamps for each pass (each full pass ≈ 56 min on CPU,
onnxruntime-node q4f16).

Model: `onnx-community/gemma-4-E2B-it-ONNX`, Node onnxruntime-node CPU q4f16,
generation defaults mirroring `transformersjs-engine.ts` (temp 0.6, rep-pen 1.3,
max 200 new tokens) — directly comparable to prior days.
