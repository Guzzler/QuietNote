/**
 * Engine factory — returns the appropriate InferenceEngine for a given runtime.
 *
 * Currently only WebLLM is implemented. When MediaPipe or Transformers.js
 * backends are added, register them here and the rest of the app stays unchanged.
 */

import type { InferenceEngine, RuntimeId } from "./types";
import { WebLLMEngine } from "./webllm-engine";

export function createEngine(runtime: RuntimeId = "webllm"): InferenceEngine {
  switch (runtime) {
    case "webllm":
      return new WebLLMEngine();
    case "mediapipe":
      throw new Error("MediaPipe backend is not yet implemented.");
    case "transformersjs":
      throw new Error("Transformers.js backend is not yet implemented.");
    default:
      throw new Error(`Unknown runtime: ${runtime}`);
  }
}

export { WEBLLM_MODEL_REF } from "./webllm-engine";
export type { InferenceEngine, EngineStatus, GenerateOptions, LoadProgress, RuntimeId } from "./types";
