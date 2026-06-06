# 2026-06-05 — Day-5: persist passing `empathy-mt-*` bodies + second-sample verdict

## Summary

Surgical `eval:`-class instrumentation change to `src/utils/evalDriver.ts`
(report renderer only — scorer untouched, prompts untouched) so passing
multi-turn `empathy-mt-*` bodies are always rendered in the markdown report,
even when they sit past position 5 in the passing list. Then re-ran the
identical empathy slice to (a) finally read the check-in `mt-3` body Day-4
could not see and (b) take a second independent sample of `mt-3` across all
4 modes.

## What changed

1. **`src/utils/evalDriver.ts`** — `reportToMarkdown` "Sample Passing Cases"
   section now front-loads every passing `empathy-mt-*` body, dedupes, then
   appends up to 5 non-MT passing bodies. Previous behaviour
   (`passing.slice(0, 5)`) silently dropped any multi-turn pass past position
   5 — which is exactly why Day-4 could not read the check-in `mt-3` body.
   Renderer-only; PASS/FAIL logic and case selection unchanged.

2. **`src/utils/__tests__/evalDriver.test.ts`** — added a focused test
   asserting that a synthetic report with a passing `empathy-mt-3` at
   position 8 has its body rendered in the markdown output.

3. **`docs/eval-runs/2026-06-05/`** — second-sample empathy slice
   (`--dimensions=empathy --per-dim=11`) with all four `empathy-mt-1..4`
   IDs in every mode and the check-in `mt-3` body now present.

4. **`docs/critic-reports/2026-06-05.md`** — Day-5 report with the body-
   persistence note, the `multi_turn_memory` table including the check-in
   `mt-3` body, the second-sample verdict, the `redteam-7.2` re-fire
   observation, weakest-3, EVAL counter = 5/7.

5. **`docs/north-star.csv`** — 4 rows dated 2026-06-05. Check-in
   `multi_turn_memory` resolved from provisional 4 → revised 3 (the now-
   readable body is a surface-word latch, not an entity callback).

6. **`docs/decisions.md`** — 2026-06-05 entry's `actual:` filled in.

## What did NOT change

- `src/utils/evalRunner.ts` (scorer)
- `src/prompts/systemPrompts.ts` (prompts)
- `EVAL_CASES.length` (still 63)
- Anything UI-facing

Freeze gate
`git diff origin/main -- src/utils/evalRunner.ts src/prompts/systemPrompts.ts`
is **empty**.

## Key result

Second-sample `empathy-mt-3` verdict: **HARDENED**. Experience-FAIL in 4/4
modes across two independent samples (Day-4 + Day-5, temp=0.6). The check-in
`mt-3` body, now readable, is the same surface-word-latch shape as the other
three modes — confirming the Day-4 `multi_turn_memory = 4 (provisional)` was
a scorer artifact. The 2026-06-03 continuity directive is empirically
insufficient.

The queued structural `feat:` (prior-turn entity surfacing — context-
summarization OR chat-template restructuring) is the **confirmed next BUILD
action**. It stays **BLOCKED until phase = BUILD**. Not implemented this
slot. No second prompt sentence added.

`redteam-7.2` re-fired in gratitude with a crisis-line response on a non-
crisis prompt — confirmed stable model gap; future guardrail-precision
`feat:` candidate, *queued behind* the multi-turn `feat:`.

## Tests

- `npm run build` — green
- `npm run test` — 995/995 (61 files), incl. new body-persistence test +
  `EVAL_CASES.length` freeze guard + `evalScorerCorrections.test.ts`

## Next steps

- Day 6 (next EVAL slot, counter → 6/7) — per PHASE.md governance. If
  `redteam-7.2` re-fires a third time, write the guarded structural sketch
  for a guardrail-precision `feat:`.
- At counter = 7/7 the phase flips to BUILD and the structural `feat:`
  (prior-turn entity surfacing) becomes implementable.
