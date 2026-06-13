# Day 12 — Input-robustness eval cases (Track B1)

**Date:** 2026-06-13
**Type:** `eval:` (harness extension — no product-surface behavior change)
**Roadmap:** Track B1 → **DONE**. Re-activates the eval→tune loop, dormant since 2026-06-09 (Days 10–11 were UI-only).
**Plan:** [docs/daily-plans/2026-06-13-plan.md](../daily-plans/2026-06-13-plan.md)
**Spec:** [docs/field-notes/2026-06-09-real-user-data-plan.md](../field-notes/2026-06-09-real-user-data-plan.md) Phase 1.

## Summary

Added a new `input_robustness` eval dimension with **12 paraphrased cases** derived from real launched-app entry shapes (1,377 entries, 293 users: median 16 words, 22% ≤5 words, plus gibberish, greetings-as-entries, load-bearing typos) and the 79 labeled not-helpful votes' failure taxonomy. Wired the dimension through the heuristic scorer and ran a fresh north-star baseline — the first since 2026-06-09.

`EVAL_CASES` bumped **63 → 75** under a freeze-lift (decisions.md entry written first, per the standing scorer freeze).

## Result (headline)

**input_robustness baseline: 41/48 = 85%** across all 4 modes (full 12-case dimension run):

| Mode | Pass | Notes |
|---|---|---|
| freewrite | 11/12 | only `ir-2.2` fails |
| gratitude | 10/12 | `ir-2.1`, `ir-2.2` fail |
| checkin | 10/12 | `ir-2.1`, `ir-2.2` fail |
| thoughtrecord | 10/12 | `ir-2.1`, `ir-2.2` fail |

**Collateral regression sweep** (`--per-dim=2`, all 8 dimensions × 4 modes): **63/64 = 98%** — freewrite 16/16, gratitude 16/16, checkin 15/16, thoughtrecord 16/16. The single miss (`specificity-8.1`, checkin) is a stochastic format artifact (model emitted a 10-sentence numbered list, max 4) — not a banned-opener, not a safety failure, and not caused by this change. **No medical/jailbreak/boundary/persona failure anywhere. No regression.**

### Hard Rule 1 (apples-to-apples)

No model or prompt was touched today — this is a pure harness add. So model quality cannot have moved: the collateral 63/64 (98%) is consistent with 2026-06-07's 54/56 (96%) and 2026-06-09's 55/56 baselines (all per-mode overall held at 4/4/4/4, no safety dim ≤2). The new `input_robustness` dimension is **reported separately** rather than folded into the historical weighted-overall, so the comparison to 2026-06-06 stays apples-to-apples and Hard Rule 1 is not tripped by a definitional change. The north-star.csv schema is unchanged (no new column); 2026-06-13 rows carry the 2026-06-09 dimension scores forward (model unchanged) with this doc as the notes path.

## Failure-by-family breakdown (the input to B2)

The 12 cases span five families from the not-helpful-vote taxonomy. **Four of five families pass cleanly in all 4 modes; the gibberish family is the lone weak spot.**

| Family | Cases | Result | Verdict |
|---|---|---|---|
| 1 — Ultra-terse (≤5 words) | ir-1.1–1.4 | **PASS all 4 modes** | model echoes the concrete topic + asks a grounded question |
| 2 — Gibberish / punctuation | ir-2.1, ir-2.2 | **FAIL** (ir-2.2 all 4 modes; ir-2.1 3/4) | **the cluster B2 must fix** |
| 3 — Positive → don't pathologize | ir-3.1, ir-3.2 | **PASS all 4 modes** | affirms accomplishment, no projected anxiety |
| 4 — Toxic-positivity trap | ir-4.1, ir-4.2 | **PASS all 4 modes** | engages the underlying feeling, doesn't cheerlead |
| 5 — Load-bearing typo | ir-5.1, ir-5.2 | **PASS all 4 modes** | engages plausible meaning (debt, overwhelm) |

### Why Family 2 fails (concrete bodies)

On gibberish/punctuation the model *attempts* a question but **projects an emotional read instead of plainly asking for clarification**, missing the clarify-phrase requirement:

- `ir-2.2` (input `.......`), freewrite: *"You typed '.......', which leaves space for many things to surface. When you pause like that, **what emotion surfaces** right before the silence settles in?…"* — projects emotion onto pure punctuation.
- `ir-2.1` (input `asdkfj lkjwer hjkl`), gratitude: *"I detect confusion regarding those random letters, and I wonder **what thoughts were leading to typing them**? **What kind of emotions came up** while writing those characters?"*
- `ir-2.1`, freewrite (**passes**): *"I see you typed some random letters. **Could you tell me more** about what brought up those characters for you right now?…"* — proves the criterion is reachable; the model is just inconsistent.

The `mustNotContainAny` emotion-read guard (`sounds like you`, `overwhelmed`, …) mostly held; the failures are on the `mustContainAny` plain-clarify phrasing. The real-world weakness is genuine (interpreting noise rather than asking), with a secondary keyword-strictness component worth noting for B2.

## What changed (files)

- **`src/utils/evalRunner.ts`** — `EvalDimension` union + `| "input_robustness"`; 12 new `EVAL_CASES` (ir-1.1…ir-5.2, all invented/paraphrased, all `mustNotStartWithBanned`); `runEvalSuite` `byDimension` record entry.
- **`src/types.ts`** — `ScoringDimension` union + `| "input_robustness"`.
- **`src/utils/evalScorer.ts`** — `DIMENSION_WEIGHTS.input_robustness = 1.0` (quality dim, not safety → no 2× weight); new minimal `INPUT_ROBUSTNESS_SIGNALS` (penalize generic deflection / toxic-positivity cheerleading / emotion-projected-onto-input, credit a grounded clarifying question); `SIGNAL_SETS` entry; both `allDimensions` aggregation arrays.
- **`src/components/EvalPanel.tsx`** — `ALL_DIMENSIONS` entry.
- **`src/utils/baselineCollector.ts`** — `dimensions` + `weights` enumerations.
- **`docs/evals/baseline-responses.json`** — 12 synthetic exemplar responses for the new cases (the file is a synthetic baseline fixture; the integration tests in evalPipeline.test.ts assert one entry per `EVAL_CASES`).
- **Tests** — three `toBe(63)→toBe(75)` freeze-count bumps (conversationContext, evalScorerCorrections, systemPrompts); evalScorer/evalPipeline dimension-count bumps (7→8 scores per case); new `input_robustness` structural tests + a `DIMENSION_WEIGHTS` completeness guard in evalRunner.test.ts.

## Tests

`npm run build` green (tsc strict). `npm run test`: all eval-harness suites green; **75-case freeze re-asserted in 3 places**, 8-dimension scoring re-asserted. The only failing test is the pre-existing date-dependent `MoodHistoryPanel` "Today/Yesterday" grouping flake (fails identically on clean `main` — confirmed via `git stash`; unrelated to this change).

## Eval artifacts

- `docs/eval-runs/2026-06-13/input_robustness/` — full 12-case dimension run (per-mode `.md` + `summary.json`).
- `docs/eval-runs/2026-06-13/collateral-perdim2/` — regression sweep across all 8 dimensions.

## Next steps (B2)

Fix the **gibberish/nonsense cluster** (`ir-2.*`: clarify-don't-project) via the mechanism ladder — prompt tune first (a "when input is unintelligible, ask plainly what they meant; never name an emotion you can't see" beat), then a deterministic guard if the prompt layer is exhausted. **Families 1/3/4/5 already pass — do not chase them.**
