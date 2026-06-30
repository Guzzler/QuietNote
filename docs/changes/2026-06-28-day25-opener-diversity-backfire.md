# Day-25 (2026-06-28) — Full dimensional critic read + opener-diversity tune (attempted, reverted)

## Summary

Ran the first **full 4-mode dimensional critic read** since Day-22, confirmed the
two cumulative medical tunes (Day-23 MEDICAL PRECEDENCE + Day-24 GENERAL-TERMS
REFERRAL) caused **no empathy/specificity regression at full-suite scale**,
regenerated the drained ranked-move list, and **attempted** the plan's pre-named
opener-diversity tune. The tune **backfired (negation-priming) and was reverted**.
This is therefore a **docs-only** change: the Day-25 critic report + the full
baseline/post-tune eval data + a decisions entry. No source ships.

## What changed (docs only)

- `docs/critic-reports/2026-06-28.md` — Day-25 critic report (refreshed scoreboard, the §2.2 opener-tic verdict, the backfire analysis, a re-ranked next-moves list, north-star ledger row, freeze/hard-rule check).
- `docs/eval-runs/2026-06-28/` — canonical per-mode baseline (`es-*`, `safety-*`) + post-tune (`espost-*`, `safetypost-*`) reports, two progress logs, and `NOTE.md` (UTC-rollover explanation; live files were stamped under `2026-06-29/`).
- `docs/decisions.md` — one-line Day-25 entry (tried + expected + actual).

**No change to:** `src/prompts/systemPrompts.ts` (the attempted beat was reverted; byte-identical to `main`), `evalScorer.ts`/`evalRunner.ts`/`EVAL_CASES` (freeze gate empty), crisis/guardrail/disclaimer/sessionContext.

## The read (the provable core)

| Dimension | Day-22 | Day-25 | Verdict |
|---|---|---|---|
| empathy (full suite) | 44/44 | **43/44** | no regression (1 cross-turn continuity flicker, temp-0.6) |
| specificity (full suite) | 56/60 | **56/60** | identical; checkin question-stacking stays fixed |
| medical_refusal thoughtrecord | 5/16 (31%) | **15/16 (94%)** | Day-23 precedence fix held — outlier → best mode |
| medical_refusal (other modes) | 69–75% | 81–88% | all ≥ post-Day-24 baseline |
| jailbreak / boundary / format | near-perfect | near-perfect | residual misses are keyword-list artifacts, not compliance |

**Confirmed:** two medical strengthenings across all 5 prompts cost nothing in
empathy/specificity at full scale. Measurement honesty goal met.

## Why the tune was reverted

The plan's candidate — a soft beat naming the overused opener verbs
("surfaces", "resonates deeply with", "connects to", "brings up") and the
"heavy weight" cliché as discouraged — **made the 2B model use them more**:

| | baseline freewrite | post-tune freewrite | baseline gratitude | post-tune gratitude |
|---|---|---|---|---|
| clinical-verb openers | ~3/9 | **9/9** | ~4/9 | **8/8** |
| "surfaces" occurrences | 1 | 3 | 1 | **5** |

Negation-priming ("don't think of an elephant"). The Day-22 prediction that a
hard ban would just trigger rotation generalizes to soft naming. Pass-rates were
neutral (the scorer doesn't penalize these verbs), but the tune worsened the
exact tic it targeted, so per Hard Rule #1 it was reverted.

## Tests

No new tests ship (source reverted). Reverted `main` re-verified: **build green,
1231/1231 tests pass**. The attempted tune's contract test (`OPENER-DIVERSITY
beat`) was removed along with the revert.

## Next steps (from the report's ranked list)

1. Opener monotony needs a **non-naming** mechanism — try positive-only varied
   exemplar openers in the FIRST LINE RULE first (prompt-only, lowest risk);
   a deterministic opener-variety re-roll backstop is the freeze-gated fallback.
2. Resolve the medical scorer-echo + keyword-list gaps (add "physician"; relax
   `must-not-contain` when a valid referral is present) — needs a freeze-lift.
3. Watch the indirect-cohort referral omissions (bipolar self-diagnosis,
   discontinuation, "oils for mood"); broaden the MEDICAL trigger only with a
   hard over-trigger guard.
