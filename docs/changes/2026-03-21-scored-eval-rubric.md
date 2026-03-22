# Scored Eval Rubric & Baseline Scoring Pipeline

**Date:** 2026-03-21
**Branch:** eval/2026-03-21-scored-eval-rubric
**PR:** #9

## Summary

Implements the scored evaluation rubric and baseline scoring pipeline that turns QuietNote's eval framework from documentation into executable scoring infrastructure. Scores all 27 synthetic baseline responses across 6 dimensions with weighted pattern-based heuristics, producing the project's first quantitative eval report.

## Motivation

QuietNote had 27 eval test cases, a 6-dimension scoring rubric design, and response guardrails — but zero scored data. Without the scorer and collector utilities, there was no way to empirically verify whether the Gemma 2B model actually behaves safely. This change closes the evaluation loop by making the framework executable.

## User Impact

No direct user-facing changes. This is evaluation infrastructure that enables:
- Quantitative measurement of model safety and quality
- Baseline comparisons when testing new models or prompt changes
- Automated detection of safety dimension regressions

## Technical Details

### New files:
- `src/utils/evalScorer.ts` — 6-dimension pattern-based scorer with configurable weights
  - Dimensions: persona (1.0x), medical_refusal (2.0x), jailbreak (2.0x), format (0.5x), empathy (1.5x), boundary (1.5x)
  - Each dimension has positive and negative signal patterns with calibrated penalties
  - Scores on 0–5 scale: 5=exemplary, 3=adequate, 0=failing
- `src/utils/baselineCollector.ts` — Offline scoring harness
  - Parses baseline JSON, matches to eval cases by ID, scores through evalScorer
  - Generates markdown reports with per-case scores, dimension averages, and flagged cases
- `src/utils/__tests__/evalScorer.test.ts` — 17 unit tests for scorer dimensions
- `src/utils/__tests__/evalPipeline.test.ts` — 7 integration tests for full pipeline
- `docs/evals/scored-report-2026-03-21.md` — First quantitative eval report

### Modified files:
- `src/types.ts` — Added `DimensionScore`, `ScoredEvalResult`, `ScoredEvalReport` types

### First eval results:
- Weighted overall: **3.68 / 5.0**
- All safety dimensions >= 3.0
- Zero flagged cases (no safety dimension scored <= 2)
- Format dimension highest at 4.50 (synthetic baselines are well-formatted)
- Medical refusal lowest at 3.30 (most room for improvement)

## Safety Review

- **evalScorer.ts is read-only** — analyzes responses but never modifies app behavior
- **Pattern-based scoring has inherent limitations** — false positives/negatives possible on novel phrasing
- **Conservative scoring approach** — starts at baseline 3 ("adequate"), requires positive signals to score higher
- **Safety dimensions weighted 2x** — ensures medical_refusal and jailbreak failures are amplified in overall scores

## Validation

- 268 tests passing (24 new)
- TypeScript type check clean
- App loads and runs without errors (verified via browser)
- Scorer correctly identifies known-good and known-bad responses per dimension

## Limitations

- Pattern-based scoring is a heuristic — not a replacement for human review
- Synthetic baselines represent expected behavior, not actual model output
- Scorer cannot detect novel harmful patterns not covered by signal sets

## Next Steps

1. Collect real Gemma 2B model responses and score them with this pipeline
2. Compare scored results between synthetic baselines and actual model output
3. Identify dimensions where the real model underperforms synthetic baselines
4. Consider promoting response guardrails from monitoring to blocking for patterns the model frequently violates
