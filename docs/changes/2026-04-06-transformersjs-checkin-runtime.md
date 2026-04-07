# Transformers.js Backend, Check-in Mode, and Runtime Selector

**Date:** 2026-04-06
**PR:** #26
**Branch:** `feat/2026-04-06-transformersjs-checkin-runtime`

## Summary

Three features implementing all three daily plan priorities: a second inference backend (Transformers.js), the Morning/Evening Check-in journaling mode, and a runtime selection UI.

## What Changed

### 1. Transformers.js v4 Backend (Objectives 2 + 3)
- New `TransformersJSEngine` class implementing the `InferenceEngine` + `EngineCapability` interfaces
- Loads `onnx-community/gemma-3-1b-it-ONNX` model with Q4F16 quantization
- Supports WebGPU (preferred) with automatic WASM fallback
- Streaming generation via `TextStreamer` with async token queue
- Registered in the engine factory alongside WebLLM
- Proves the runtime adapter architecture works with multiple backends

### 2. Morning/Evening Check-in Mode (Objective 1)
- Third journaling mode added to `JournalingModeSelector` ("Check-in")
- Time-of-day detection: morning (5am-12pm) vs evening
- Morning: Sun icon, prompts for feeling → focus → concerns
- Evening: Moon icon, prompts for review → wins → reflection
- `CheckInGuide` component with step indicator (mirrors GratitudeGuide pattern)
- Separate system prompts for morning and evening to guide AI responses
- Step tracking in App.tsx with reset on session/mode change

### 3. Runtime Selection UI (Objective 3)
- New "Inference Engine" section in Privacy Dashboard
- Radio button selector: WebLLM (Gemma 2 2B) vs Transformers.js (Gemma 3 1B)
- Selection persisted to localStorage
- `useInferenceEngine` hook refactored:
  - Generic capability checking (no longer `instanceof WebLLMEngine`)
  - `switchRuntime()` function that disposes old engine and creates new
  - `runtimeId` state exposed for UI binding

## Technical Details

- `@huggingface/transformers` added as dependency
- Dynamic import used in engine to avoid loading library at startup
- Transformers.js bundled ONNX Runtime Web adds ~22MB WASM + ~540KB JS to the build
- All 295 existing tests pass; build succeeds with zero TS errors

## Screenshots
- `docs/screenshots/2026-04-06/checkin-evening-mode.png` — Evening check-in mode
- `docs/screenshots/2026-04-06/privacy-dashboard-runtime-selector.png` — Runtime selector UI

## Next Steps
- Test Transformers.js backend with WebGPU in a supported browser
- Compare response quality between Gemma 2 2B (WebLLM) and Gemma 3 1B (Transformers.js)
- Add unit tests for TransformersJSEngine and CheckInGuide
- Explore LiteRT-LM as a third backend option
- Morning check-in verification (requires testing during AM hours)
