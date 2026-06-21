# Day 19 — Track C population run: full conversation-script matrix + C3 gate resolution

## Summary

Ran the **full conversation-script eval matrix** (`npm run eval -- --mode=freewrite --limit=1 --scripts --strategy=all`) against the real Gemma 4 E2B model: **all 4 scripts × 3 context strategies = 12 live cells**, ~141 CPU generations. This turns yesterday's n=1 C2 result into a population, adds the two never-run-live signals (**thoughtrecord 5-step coherence**, **checkin-retention probe**) under the real app path, and resolves the **C3 go/no-go gate**.

**Decision: C3 stays DEFERRED (confirmed). Fundamental Problem #2 is declared closed at long-conversation/population scale.** Next roadmap pick: **D1 (tool-calling spike)**.

This is a **measurement run** — no source code changed. The freeze gate stayed empty and no new tests were needed.

## What was run

| Script (probes) | raw | **managed** (real path) | norecap | Step-coherent | post-trim probes (managed) |
|---|---|---|---|---|---|
| freewrite-retention (2) | 1/2 | **2/2** | 0/2 | — | n/a (never trims) |
| freewrite-longtrim (2) | 0/2 | **2/2** | 0/2 | — | **2/2** (first trim t14) |
| checkin-retention (1) | 1/1 | **1/1** | 1/1 | — | n/a (never trims) |
| thoughtrecord-steps (0) | — | — | — | **true** (all strategies) | n/a |

All scored (non-probe) turns passed under every strategy (7/7, 10/10, 5/5, 6/6 per cell) — no warmth/banned-opener/length regression at length.

## Key findings

1. **`managed` is best-or-tied on every probe-bearing script.** It strictly beats both controls on the two freewrite scripts and ties on checkin (which never trims, so its single probe stays inside the raw window for all strategies — an expected tie, not a counter-signal).
2. **The recap is load-bearing exactly when trimming occurs.** Only `freewrite-longtrim` crosses the trim boundary; under `managed` its post-trim probes are **2/2**, under `managed-norecap` (recap stripped) **0/2**. This replicates yesterday's n=1 on a fresh seed.
3. **Thoughtrecord step-coherence holds** — `stepCoherent: true` under all three strategies. The model walks CBT steps 1→5 contiguously over a full guided session on the real path. This was the single biggest unmeasured hole in Track C; it is now filled.
4. **The C3 reopener did not trigger.** The gate said: re-open iff `managed` drops a post-trim probe anywhere, or thoughtrecord coherence fails. Neither happened.

## C3 decision

**DEFERRED, confirmed.** No observed decay justifies summarize-on-trim. No `MODEL_CONTEXT_LIMIT` / `RESERVED_FOR_GENERATION` change is indicated. The candidate fix (fold a synopsis of trimmed turns into the recap line, extending `conversationContext.ts`) remains **spec-only** and freeze-lift-gated; it re-opens only on a future run where `managed` drops a post-trim probe or thoughtrecord coherence fails.

**Problem #2 closed at population scale** with explicit caveats: single 2 B model (Gemma 4 E2B), CPU q4f16 quantization, substring-match probes (not semantic), one seed per cell, and trim is exercised by only one script (the others stay under the window).

Full analysis: [`docs/eval-runs/2026-06-21/C2-population-findings.md`](../eval-runs/2026-06-21/C2-population-findings.md). The n=1 record at [`docs/eval-runs/2026-06-20/C2-findings.md`](../eval-runs/2026-06-20/C2-findings.md) is preserved unchanged.

## Files

- **New:** `docs/eval-runs/2026-06-21/conversation-scripts.md` (12-cell matrix output), `docs/eval-runs/2026-06-21/summary.json` (`scripts` block, 12 entries), `docs/eval-runs/2026-06-21/C2-population-findings.md` (analysis + C3 decision).
- **Updated:** `docs/ROADMAP.md` (Problem #2 line; added C2b DONE line; C3 → DEFERRED-confirmed with next-pick note), `docs/decisions.md` (one-line tried/expected/actual entry).
- **Preserved:** `docs/eval-runs/2026-06-20/C2-findings.md` (historical n=1).

## Validation

- **Freeze gate empty:** `git diff origin/main -- src/utils/evalRunner.ts src/utils/evalScorer.ts src/prompts/ src/utils/tokenEstimator.ts src/utils/conversationContext.ts` → no output. No source changed (pure measurement run).
- `npm run build` — clean (TS strict).
- `npm run test` — green, unchanged baseline (no code change).
- `summary.json` `scripts` block has exactly 12 cells; all probe counts integers in `[0, probes]`; `conversation-scripts.md` rendered without error.

## Note on PR screenshots

Per standing feedback, PRs include browser screenshots **only when UI changes**. This run is non-UI (eval measurement + docs only) — nothing user-visible changed, so no screenshot applies. The eval-run markdown tables are the evidence.

## Next steps

Track C measurement is complete. The next roadmap pick is **D1 (tool-calling spike)** — define the ultra-constrained call grammar and a 20-case eval (valid-call rate, argument accuracy, ~0 false-call rate on ordinary journaling turns), gated at ≥80% valid + ~0 false calls.
