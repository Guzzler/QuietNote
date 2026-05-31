# 2026-05-30 — Day-3 harness extension + indirect-medical tune

## Summary

Day-3 of the EVAL→TUNE cycle. This change ships the deterministic, code-only
parts of `docs/daily-plans/2026-05-30-plan.md`:

- **Priority 2 (eval):** widen the specificity scorer to all 4 modes and tag
  every existing `medical_refusal` case as direct vs indirect.
- **Priority 3 (tune):** add a single `MEDICAL / HEALTH / MEDICATION RULE`
  block to all 5 system prompts in `src/App.tsx`, targeting the indirect-medical
  regression flagged in `docs/critic-reports/2026-05-29.md`.

Priority 1 (the Day-3 full critic re-run) is **deferred to the next interactive
session** — model inference for the eval suite must run in a real Chrome
context (Transformers.js + WebLLM), and the headless `Cache.add UnknownError`
blocker noted in the plan's Pre-flight section still applies. The harness
changes here prep the report so the interactive critic can produce the
cross-mode specificity column and the direct/indirect medical split that
yesterday's report could not.

## What changed

### Harness (`eval:`)

- `src/utils/evalRunner.ts`
  - New `medicalIndirect?: boolean` field on `EvalCase`. Every existing
    `medical_refusal` case (incl. `redteam-7.1`, `redteam-7.4`,
    `medical-2.7-regression`) tagged. Direct = named medication, dose, or
    therapy modality; indirect = supplement name, condition name, or symptom
    cluster.
  - 9 new cross-mode specificity cases: `gratitude-specificity-{1,2,3}`,
    `checkin-specificity-{1,2,3}`, `thoughtrecord-specificity-{1,2,3}`. Same
    `mustNotStartWithBanned: true` / `maxSentences: 3` criterion as
    `specificity-8.x`; prompts framed for each mode.
  - `runEvalSuite` summary now emits `medicalRefusalDirect` and
    `medicalRefusalIndirect` counts.
- `src/utils/evalDriver.ts`
  - `EvalRunReport.summary` extended with the same two split counters.
  - `reportToMarkdown` renders a "Medical Refusal — Direct vs Indirect" table
    after the per-dimension table when at least one tagged case has run.
- `src/utils/__tests__/evalRunner.test.ts` — 3 new tests covering the
  cross-mode case shape, the tag invariant, and the direct/indirect
  aggregation.
- `docs/evals/baseline-responses.json` — 9 new baselines so
  `systemPromptEval.test.ts` stays green.

### Prompt (`tune:`)

- `src/App.tsx` — single `MEDICAL / HEALTH / MEDICATION RULE` block inserted
  near the top of each of the 5 mode prompts (free-write, gratitude,
  check-in morning/evening, thought record). Wording per
  `docs/daily-plans/2026-05-30-plan.md` §D Priority 3, with explicit
  supplement and condition examples to cover the indirect cohort.

## Why

`docs/critic-reports/2026-05-29.md` flagged that medical_refusal regressed
from 73% (2026-05-28) to 56% (2026-05-29), driven entirely by indirect prompts
(CBD, St. John's Wort, ADHD symptom requests) that received warm
acknowledgement without naming a professional. Yesterday's tune (`f67c267`)
addressed openers, end-of-response questions, and safety carveouts — nothing
in it touched medical refusal. Without an intervention this regression
compounds into Day 3.

The harness changes are pre-requisite to measuring the fix: today's report
needs to slice medical_refusal into direct/indirect cohorts before we can
say whether the new rule moved the right number. The cross-mode specificity
cases are the matching pre-req for measuring whether the FIRST LINE RULE
merged 2026-05-29 generalises beyond Free Write.

## Safety floor — preserved

- AI-limitations disclaimer untouched.
- No edits to `src/utils/responseGuardrails.ts`, `src/utils/crisisDetection.ts`,
  or any inference engine.
- FIRST LINE RULE, END-OF-RESPONSE RULE, SAFETY CARVEOUT, and
  ACKNOWLEDGE-BEFORE-STEP rules merged 2026-05-29 are untouched.
- The new MEDICAL rule only adds a positive requirement (must name a
  professional) and bans clinical content — it cannot loosen any existing
  guardrail.

## Tests

- Full Vitest suite: **977 pass / 0 fail** (was 968 before today; +9 from
  the harness changes).
- `npm run build`: clean.
- TypeScript strict: clean.

## Deferred — needs an interactive run

- `docs/critic-reports/2026-05-30.md` — Day-3 full critic.
- `docs/eval-runs/2026-05-30/{freewrite-fullsuite,gratitude,checkin,thoughtrecord}.md`
- `docs/eval-runs/2026-05-30/post-tune-medical-slice.md` — the Priority 3
  validation slice (~15 cases).
- `docs/screenshots/2026-05-30/active-backend.png`.
- 4 new rows on `docs/north-star.csv` for 2026-05-30.

These all require a real browser session with model inference, which a
scheduled task cannot reliably produce given the documented headless
Cache.add blocker. The harness in this PR is what makes that interactive
run produce the cross-mode + direct/indirect numbers the plan calls for.

## Next steps

1. Run the EvalPanel against Transformers.js Gemma 4 E2B in a real Chrome
   tab; copy markdown to `docs/eval-runs/2026-05-30/*.md`.
2. Generate `docs/critic-reports/2026-05-30.md` with the tune-confirmation
   delta and the direct/indirect medical split (the harness now emits both).
3. If `medical_refusal_indirect` did not move ≥30pp, iterate one more pass
   on the MEDICAL rule wording (add more supplement / condition exemplars)
   and re-run only the medical slice.
4. Register `quietnote-critic` scheduled task (still human-only).
