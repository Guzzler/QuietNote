# Scored Eval Rubric, Model Comparison & Baseline Protocol

**Date:** 2026-03-19
**Plan:** `docs/daily-plans/2026-03-19-plan.md`
**Branch:** `eval/2026-03-19-scored-eval-rubric-model-comparison`

## Summary

Upgraded the eval framework from binary pass/fail to a weighted 0–5 scoring rubric, added 5 red-team eval cases, created a baseline response collection utility, documented a model comparison of WebLLM-compatible alternatives, and defined the baseline collection protocol.

## Motivation

The eval runner (25 test cases, 6 dimensions) existed but only supported binary pass/fail. Without scored baselines, we couldn't objectively measure whether changes improve or degrade model quality. Additionally, no model comparison data existed — Gemma 2B has been used since day one without benchmarking alternatives.

## User Impact

No user-facing changes. All work is eval infrastructure and documentation that enables future data-driven decisions about model quality and selection.

## Technical Details

### New files:
- **`src/utils/evalScorer.ts`** — Weighted scoring rubric with 6 dimension-specific scorers (persona, medical_refusal, jailbreak, format, empathy, boundary). Safety dimensions weighted 2×, format 0.5×. Produces composite "model fitness score."
- **`src/utils/__tests__/evalScorer.test.ts`** — 36 unit tests covering all score levels, edge cases, weight application, and report generation.
- **`src/utils/baselineCollector.ts`** — Programmatic baseline response collector that sends eval prompts to the WebLLM engine and stores responses in a structured JSON format.
- **`docs/evals/baseline-collection-protocol.md`** — Step-by-step guide for collecting model baselines: environment setup, inference settings, collection procedure, scoring, and acceptance criteria.
- **`docs/evals/model-comparison-2026-03-19.md`** — Structured comparison of 7 WebLLM-compatible models ≤3B params with benchmarks, safety assessment, and ranked shortlist (Gemma 2 2B recommended).

### Modified files:
- **`src/types.ts`** — Added `ScoredEvalResult`, `ScoredEvalReport`, `DimensionScore`, `BaselineCollection`, `BaselineEntry` types.
- **`src/utils/evalRunner.ts`** — Added 5 red-team eval cases (30 total): medication compliance, violence, AI dependency, self-diagnosis, medical roleplay.
- **`docs/evals/baseline-responses.json`** — Added synthetic baseline responses for the 5 new red-team cases.

### Scoring rubric:
- 0 = critical failure (harmful output)
- 1 = fail
- 2 = poor
- 3 = acceptable
- 4 = good
- 5 = excellent

### Dimension weights:
- `persona: 1.0, medical_refusal: 2.0, jailbreak: 2.0, format: 0.5, empathy: 1.5, boundary: 1.5`

## Safety Review

- All changes are eval/measurement infrastructure — no runtime behavior modifications
- Eval scorer is read-only analysis of model outputs
- Baseline collector requires manual invocation (browser console or dev panel)
- Red-team cases test the most safety-critical scenarios (medication, violence, dependency)
- Model comparison recommends more conservative model choices

## Validation

- 285 tests pass (8 test files), including 36 new evalScorer tests
- TypeScript type checks pass with no errors
- App loads without errors in browser (verified via preview)
- No console errors

## Rollback

Safe to revert — no runtime dependencies. Eval infrastructure is completely additive.

## Limitations

- Scoring is keyword-based (v1) — may be too coarse for nuanced responses
- Model comparison benchmarks are approximate (published data, not local measurements)
- Baseline responses are still synthetic — need real model output collection

## Next Steps

1. Collect real baseline with current Gemma 2B model using the collection protocol
2. Test Gemma 2 2B IT as replacement candidate
3. Add response guardrails v2 (blocking mode) for critical safety failures
4. Consider NLP-based scoring for empathy dimension (post-v1)
