# 2026-05-28 — Bootstrap the critic loop + first real critic report

## Summary

The EVAL phase's feedback loop was scaffolded on 2026-05-25 (PHASE.md, decisions.md,
north-star.csv, an empty critic-reports/ dir) but the machinery that fills it never ran:
no critic agent existed, the governance files were untracked, and the executor was not
phase-aware. As a result `critic-reports/` sat empty for 3 days and the EVAL exit
criterion ("7 consecutive days of critic reports") could never start counting.

This change stands the loop up: it writes the critic protocol into the repo, produces the
**first real critic report** by running the eval harness against the live model, records
the first north-star data, and documents the two setup steps only the user can perform.
This is docs/eval work only — **no source code was changed** (allowed verbs in EVAL).

## What changed and why

- **`docs/critic/CRITIC.md`** — the durable critic protocol (steps, scoring rubric, the
  harness-dimension → north-star-dimension mapping, and the fallback when the model can't run).
  So the procedure is reproducible by a human, the planner, or a future scheduled task.
- **`docs/critic-reports/2026-05-28.md`** — the first real critic report. Also the long-pending
  post-tuning baseline for commit `32241f2`.
- **`docs/north-star.csv`** — first 4 data rows (one per mode). The signal Hard Rule #1 depends on.
- **`docs/critic/SETUP.md`** — the two human-only action items with paste-ready content:
  (1) register a `quietnote-critic` scheduled task, (2) make the planner + executor SKILLs
  phase-aware. These touch files outside the repo, so they cannot be done by the executor.
- **`docs/decisions.md`** — today's entry's `actual:` updated from "pending" to the outcome.

## Measurement (the post-tuning baseline)

- **Backend:** `onnx-community/gemma-4-E2B-it-ONNX` (Transformers.js v4), WebGPU on NVIDIA
  Lovelace. (The default WebLLM Gemma 2 2B was not the active engine on this box.)
- **Free Write:** 40/46 (87%) on the full suite — persona/jailbreak/format/boundary all 100%,
  medical_refusal 73%, empathy 80%.
- **Gratitude:** 19/21 (90%) on persona+format+empathy.
- **Check-in (evening):** 11/21 (52%) — empathy only 30%.
- **Thought Record:** 11/21 (52%) — format only 33%.
- Guided modes were run on the mode-differentiating dimensions only; the shared guardrail
  dimensions were not re-run per mode (identical prompt text → no added signal).

**Top findings:** (1) specificity is the weakest dimension — responses almost universally open
with the exact generic stems the prompt forbids ("It sounds like…"); the `32241f2` tuning fixed
structure (length, presence of a question) but not specificity; (2) multi-turn memory is weak —
the model often fails to echo prior-turn people/events; (3) Check-in and Thought Record routinely
emit directive statements instead of reflective questions, tanking their format pass-rate.

## Tests written

None — docs/eval only. **No source files were changed**, so per the plan's testing section
`npm run build` / `npm run test` were run only to confirm no regressions (see PR). The "tests"
this run produced are the eval measurements themselves, captured in the critic report.

## Screenshots

- `docs/screenshots/2026-05-28/eval-panel-thoughtrecord.png` — the eval harness panel with results.
- `docs/screenshots/2026-05-28/freewrite-response.png` — a real Free Write response in the app.

## Next steps

1. **User:** complete the two items in `docs/critic/SETUP.md` so the loop runs daily and the
   phase gate is enforced on the execution side.
2. **Planner (next EVAL days):** target specificity (generic-opener problem), guided-mode question
   discipline, and multi-turn memory. These are `tune:`/`eval:`/`fix:` investigations, not features.
3. The 7-day EVAL counter starts today (Day 1). Six more daily critic reports are needed before
   the phase can exit.
