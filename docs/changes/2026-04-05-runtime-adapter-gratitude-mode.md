# Runtime Adapter Interface + Guided Gratitude Journaling Mode

**Date:** 2026-04-05
**PR:** #25
**Branch:** `feat/2026-04-05-runtime-adapter-gratitude-mode`

## Summary

Three changes in one PR: (1) runtime adapter architecture enabling future model/runtime swaps, (2) guided gratitude journaling mode as the first structured journaling experience, and (3) cleanup of 8 pre-existing TypeScript build errors.

## What was changed and why

### 1. Runtime Adapter Interface (Objective 3, Phase 1)

Created an abstraction layer (`src/inference/`) so QuietNote can swap between WebLLM, MediaPipe, Transformers.js, and future runtimes without rewriting app logic. This is the critical-path blocker for all model/runtime improvements including Gemma 4 E2B migration.

**New files:**
- `src/inference/types.ts` — `InferenceEngine` interface, `EngineStatus`, `GenerateOptions`, `EngineCapability`
- `src/inference/webllm-engine.ts` — `WebLLMEngine` class implementing `InferenceEngine` + `EngineCapability`
- `src/inference/index.ts` — Engine factory (`createEngine()`) and re-exports
- `src/hooks/useInferenceEngine.ts` — React hook consuming the adapter (replaces `useMLCEngine`)

**Modified files:**
- `src/App.tsx` — Updated to import `useInferenceEngine` and use `engine.generate()` instead of raw WebLLM chat completions API

### 2. Guided Gratitude Journaling Mode (Objective 1B)

Added the first structured journaling mode. Users can switch between "Free Write" (default) and "Gratitude" modes. In Gratitude mode, the welcome card shows a 3-step guided reflection and the system prompt switches to gratitude facilitation.

**New files:**
- `src/components/JournalingModeSelector.tsx` — Pill-tab mode switcher with radio group accessibility
- `src/components/GratitudeGuide.tsx` — Step indicator and prompt display for the 3-step gratitude flow

**Modified files:**
- `src/data/journalPrompts.ts` — Added `GRATITUDE_SEQUENCE` constant
- `src/App.tsx` — Added `journalingMode` state, mode-aware system prompt selection, gratitude step tracking
- `src/components/ChatPanel.tsx` — Renders mode selector and switches welcome card based on mode

### 3. TypeScript Build Error Fixes

Fixed 8 pre-existing TS errors that blocked `npm run build`:
- Removed unused `getIntensityColor` in MoodTracker
- Removed unused imports (`detectDayOfWeekPatterns`, `EvalResult`, `primaryScore`, `primaryWeight`)
- Fixed redundant `"critical"` comparison in crisisDetection (already narrowed by outer if)
- Cast `navigator.gpu` to `any` for WebGPU type compatibility

## Tests

- All 295 existing tests pass
- `npm run build` succeeds with zero TypeScript errors
- Manual verification: mode selector renders, gratitude mode shows step indicator, switching modes works

## Screenshots

- `docs/screenshots/2026-04-05/welcome-freewrite-mode.png` — Free Write welcome screen with mode selector
- `docs/screenshots/2026-04-05/welcome-gratitude-mode.png` — Gratitude mode with step 1/3 and prompt

## Next steps

- Implement MediaPipe backend behind the adapter (Phase 2)
- Implement Transformers.js backend for Gemma 4 E2B evaluation
- Add Morning/Evening Check-in mode (next journaling mode)
- Benchmark model quality and speed across runtimes
