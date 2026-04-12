# Gemma 4 E2B MediaPipe Upgrade, Privacy Copy Fix, WebLLM Tests

**Date:** 2026-04-11
**PR:** #30
**Branch:** `feat/2026-04-11-gemma4-mediapipe-privacy-tests`

## Summary

Upgraded MediaPipe backend from Gemma 3 1B to Gemma 4 E2B, completed the privacy truthfulness pass (Phase 3) by fixing remaining misleading copy, and added WebLLM engine unit tests for full backend test parity.

## What Changed

### 1. MediaPipe Backend → Gemma 4 E2B

- **Model URL**: Changed from `storage.googleapis.com/mediapipe-models/llm_inference/gemma3_1b_gpu/...` to HuggingFace `litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task`
- **Model ref**: `gemma-3-1b-mediapipe` → `gemma-4-e2b-mediapipe`
- **Privacy Dashboard**: Now shows "MediaPipe (Gemma 4 E2B)" instead of "MediaPipe (Gemma 3 1B)"
- **Risk**: Known bug mediapipe#6270 (memory access out of bounds on some Chrome/GPU combos). Existing error recovery UI handles this — user sees error banner with Retry button.

### 2. Privacy Copy Fix (Phase 3 Completion)

Two locations missed in PR #29:
- **Welcome screen** (`ChatPanel.tsx:349`): "Everything stays on your device — nothing is sent to any server" → "After setup, everything stays on your device — your journal entries are never sent anywhere"
- **Footer** (`App.tsx:748`): "Your data never leaves this device" → "Your journal entries stay on this device"

These changes acknowledge the one-time model download while correctly stating that journal data stays local.

### 3. WebLLM Engine Unit Tests

New file: `src/inference/__tests__/webllm-engine.test.ts` with 11 tests:
- Engine name, initial status
- `checkSupport()`: no WebGPU, WebGPU available, null adapter, adapter error
- `dispose()` sets status to "disposed"
- `generate()` throws when not loaded
- Model reference metadata validation

## Technical Details

- Gemma 4 E2B uses the same `<start_of_turn>` / `<end_of_turn>` chat template as Gemma 3 — no prompt formatting changes needed
- The `.task` file format is MediaPipe-specific (LiteRT); ~2 GB download
- All three backends now have unit tests: WebLLM (11), Transformers.js (8), MediaPipe (7)

## Files Modified

| File | Change |
|------|--------|
| `src/inference/mediapipe-engine.ts` | Model URL + ref metadata |
| `src/inference/index.ts` | `MEDIAPIPE_MODEL_REF` updated |
| `src/components/PrivacyDashboard.tsx` | Model label |
| `src/components/ChatPanel.tsx` | Welcome screen copy |
| `src/App.tsx` | Footer copy |
| `src/inference/__tests__/webllm-engine.test.ts` | New (11 tests) |
| `src/inference/__tests__/mediapipe-engine.test.ts` | Updated URL assertion |

## Tests

- **364 total** (353 existing + 11 new) — all passing
- `npm run build` — zero TS errors
- Preview snapshot verified updated copy in welcome screen and footer

## Next Steps

- Manual test: MediaPipe Gemma 4 E2B model load on WebGPU-capable browser
- Phase 4: Verification & audit pass (per design doc)
- Track LiteRT-LM migration path (MediaPipe successor library)
