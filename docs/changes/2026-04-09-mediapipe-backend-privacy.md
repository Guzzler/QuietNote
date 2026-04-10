# MediaPipe Backend + Privacy Truthfulness — 2026-04-09

## Summary

Added MediaPipe LLM Inference as QuietNote's third inference runtime and updated privacy copy to be truthful about model download behavior.

## What was changed and why

### MediaPipe LLM Inference Backend (Priority 1)
- Created `src/inference/mediapipe-engine.ts` implementing the `InferenceEngine` interface
- Uses `@mediapipe/tasks-genai` package with Gemma 3 1B model via Google AI Edge WebGPU
- WebGPU support detection (no WASM fallback — MediaPipe LLM requires WebGPU)
- Streaming via callback-to-async-iterator wrapper (MediaPipe uses `ProgressListener` callbacks)
- Gemma turn markers for prompt formatting (`<start_of_turn>user/model`)
- Added `MEDIAPIPE_MODEL_REF` to `inference/index.ts` and `useInferenceEngine.ts`

### Runtime Selector UI (Priority 2)
- Privacy Dashboard now shows 3 runtime options: WebLLM (Gemma 2 2B), Transformers.js (Gemma 4 E2B), MediaPipe (Gemma 3 1B)
- Code-split: MediaPipe engine is a separate lazy chunk (2.01 KB + 57.16 KB genai bundle)

### Privacy Truthfulness Pass (Priority 3)
- Changed "0 bytes sent to external servers" → "After setup, all processing happens locally on your device"
- Updated "Zero Server Communication" description to mention one-time model download
- Updated "On-Device AI" description to clarify model files are downloaded once

## Technical details

- `@mediapipe/tasks-genai@^0.10.27` added as dependency
- MediaPipe requires `FilesetResolver.forGenAiTasks()` to initialize WASM, then `LlmInference.createFromOptions()` with model URL
- Model hosted on Google's CDN: `storage.googleapis.com/mediapipe-models/llm_inference/gemma3_1b_gpu/`
- Main bundle unchanged at ~414 KB

## Tests written

- `src/inference/__tests__/mediapipe-engine.test.ts` — 8 tests covering:
  - Engine name and initial status
  - WebGPU support detection (returns false when unavailable)
  - Dispose lifecycle
  - Generate throws when not loaded
  - Model reference metadata validation
- All 353 tests pass

## Next steps

- Manual testing on WebGPU-capable browser to verify model loading and inference quality
- Compare Gemma 3 1B (MediaPipe) vs Gemma 2 2B (WebLLM) vs Gemma 4 E2B (Transformers.js) response quality
- Consider upgrading MediaPipe model to Gemma 4 E2B when `.task` format becomes available
