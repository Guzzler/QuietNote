# Unit Tests, Gemma 4 E2B Upgrade, CBT Thought Record Mode

**Date:** 2026-04-07
**PR:** #27
**Branch:** `feat/2026-04-07-tests-gemma4-cbt-mode`

## Summary

Added 50 unit tests for all untested new features, upgraded the Transformers.js backend from Gemma 3 1B to Gemma 4 E2B, and built a CBT Thought Record as the fourth journaling mode.

## What Changed

### Unit Tests (Priority 1)
- Created `src/components/__tests__/CheckInGuide.test.ts` — 13 tests covering time-of-day detection, morning/evening prompt mapping, step progression, and completion state
- Created `src/components/__tests__/GratitudeGuide.test.ts` — 8 tests covering prompt mapping, step clamping, completion, and sequence data validation
- Created `src/components/__tests__/JournalingModeSelector.test.ts` — 8 tests covering mode definitions, check-in icon time selection, and mode uniqueness
- Created `src/components/__tests__/ThoughtRecordGuide.test.ts` — 10 tests covering all 5 CBT prompts, completion behavior, and sequence data
- Created `src/inference/__tests__/transformersjs-engine.test.ts` — 11 tests covering status lifecycle, WebGPU detection, WASM fallback, dispose, error handling, and model ref metadata
- Total test count: 345 (was 295)

### Gemma 4 E2B Upgrade (Priority 2)
- Changed `MODEL_ID` in `src/inference/transformersjs-engine.ts` from `onnx-community/gemma-3-1b-it-ONNX` to `onnx-community/gemma-4-E2B-it-ONNX`
- Updated `TRANSFORMERSJS_MODEL_REF.localId` to `transformersjs-gemma-4-e2b`
- Updated Privacy Dashboard model label from "Gemma 3 1B" to "Gemma 4 E2B"

### CBT Thought Record Mode (Priority 3)
- Created `src/components/ThoughtRecordGuide.tsx` — 5-step guided CBT thought record with purple theme and Brain icon
- Added `THOUGHT_RECORD_SEQUENCE` to `src/data/journalPrompts.ts` with 5 steps: Situation, Automatic Thought, Emotion, Evidence, Balanced Thought
- Updated `JournalingModeSelector` type to include `"thoughtrecord"` and added 4th pill
- Added `THOUGHT_RECORD_INSTRUCTION` system prompt in `App.tsx`
- Wired up `thoughtRecordStep` state with proper reset on session/mode change
- Updated `ChatPanel.tsx` to render `ThoughtRecordGuide` when in thought record mode

## Technical Details
- Tests are pure Vitest (no DOM environment needed) — they test the component logic/data rather than rendering
- The TransformersJSEngine test mocks `@huggingface/transformers` since it requires a browser/WASM environment
- The 5-step progress indicator uses slightly smaller segments (`w-5`/`w-7`) than the 3-step modes to fit comfortably

## Tests
- 345 tests pass (50 new)
- `npm run build` succeeds with zero TypeScript errors

## Screenshots
- `docs/screenshots/2026-04-07/mode-selector-4-modes.png` — All 4 mode pills visible
- `docs/screenshots/2026-04-07/thought-record-mode.png` — Thought Record step 1 of 5

## Next Steps
- Test Gemma 4 E2B model quality with WebGPU (requires real browser with WebGPU support)
- Compare response quality across Gemma 2 2B (WebLLM) vs Gemma 4 E2B (Transformers.js)
- Consider mobile layout testing with 4 mode pills
