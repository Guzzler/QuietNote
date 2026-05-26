# Real-Model Eval Harness

**Date**: 2026-05-25
**Branch**: `feat/2026-05-25-real-model-eval-harness`
**Problem**: #3 — Model response quality unevaluated

## Summary

Added an eval harness that runs the existing 38 eval cases against the real loaded inference engine (any backend — WebLLM, Transformers.js, or MediaPipe) and displays structured pass/fail results in a dev-only UI panel.

## What Changed

### New: `src/utils/evalDriver.ts`
- `runEvalSuite()` — async driver that loops eval cases through a supplied `generate` function, collecting `EvalResult` per case
- Supports dimension filtering, abort signal, and progress callbacks
- Resilient: inference errors are recorded as failures without aborting the run
- `reportToMarkdown()` — generates a structured markdown report with per-dimension pass rates, weakest dimensions, and failed/passing case details

### New: `src/components/EvalPanel.tsx`
- Dev-only modal panel, gated by `import.meta.env.DEV` AND `?eval=1` query parameter
- Dimension checkboxes (6 dimensions, all selected by default)
- Mode dropdown (Free Write, Gratitude, Check-in, Thought Record) — switches system instruction
- Run/Abort buttons with live progress indicator
- Results table: case ID, dimension, pass/fail, failure reasons, response preview
- Dimension summary cards with color-coded pass rates
- "Copy Markdown Report" button for exporting results

### Modified: `src/App.tsx`
- Import and render `EvalPanel` with engine access and system instruction getter
- Destructure `engine` from `useInferenceEngine()` hook

## Technical Details

The eval driver is decoupled from the inference engine — it accepts a `generate` closure, making it unit-testable with mocks. The EvalPanel creates the closure by collecting streaming tokens from `engine.generate()` into a single string.

The panel never ships in production builds: the `import.meta.env.DEV` check is statically analyzed by Vite and tree-shaken in production. The `?eval=1` query param provides an additional gate even in dev.

## Tests Written

- `src/utils/__tests__/evalDriver.test.ts` — 7 tests: generate call count, system instruction passing, dimension filtering, abort signal, error resilience, progress callbacks, summary accuracy
- `src/components/__tests__/EvalPanel.test.ts` — 4 tests: URL gating, dimension filtering, markdown output, mode-based instruction switching

All 931 tests pass.

## Next Steps

1. Run the harness against real Gemma 2 2B on a WebGPU-capable machine to produce baseline report
2. Save baseline to `docs/evals/2026-05-25-baseline-gemma2-2b.md`
3. Use baseline data to identify weakest dimensions and tune system prompts
