/**
 * Engine factory — returns the appropriate InferenceEngine for a given runtime.
 *
 * Uses dynamic imports so each engine (and its heavy dependencies like @mlc-ai/web-llm
 * or @huggingface/transformers) is only loaded when selected, keeping the initial
 * JS bundle small.
 */

import type { InferenceEngine, RuntimeId } from "./types";
import type { ModelRef } from "../types";

export async function createEngine(runtime: RuntimeId = "webllm"): Promise<InferenceEngine> {
  switch (runtime) {
    case "webllm": {
      const { WebLLMEngine } = await import("./webllm-engine");
      return new WebLLMEngine();
    }
    case "transformersjs": {
      const { TransformersJSEngine } = await import("./transformersjs-engine");
      return new TransformersJSEngine();
    }
    case "mediapipe": {
      const { MediaPipeEngine } = await import("./mediapipe-engine");
      return new MediaPipeEngine();
    }
    default:
      throw new Error(`Unknown runtime: ${runtime}`);
  }
}

// Model refs inlined here so static re-exports don't pull in the heavy engine modules.
export const WEBLLM_MODEL_REF: ModelRef = {
  modelId: "gemma-2-2b-it-q4f32_1-MLC",
  modelUrl: "https://huggingface.co/mlc-ai/gemma-2-2b-it-q4f32_1-MLC",
  localId: "gemma-2-2b-it-q4f32_1-MLC",
};

export const TRANSFORMERSJS_MODEL_REF: ModelRef = {
  modelId: "onnx-community/gemma-4-E2B-it-ONNX",
  modelUrl: "https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX",
  localId: "transformersjs-gemma-4-e2b",
};

export const MEDIAPIPE_MODEL_REF: ModelRef = {
  modelId: "gemma-3-1b-mediapipe",
  modelUrl: "https://storage.googleapis.com/mediapipe-models/llm_inference/gemma3_1b_gpu/float16/1/gemma3_1b_gpu.bin",
  localId: "mediapipe-gemma-3-1b",
};

export type { InferenceEngine, EngineStatus, GenerateOptions, LoadProgress, RuntimeId } from "./types";
