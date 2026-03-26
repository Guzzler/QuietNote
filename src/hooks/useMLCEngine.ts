import { useState } from "react";
import { CreateMLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";

import type { ModelRef } from "../types";
import { checkWebGPUSupport } from "../utils/webgpuCheck";

// Stock Gemma 2 2B instruction-tuned model from WebLLM's built-in model zoo.
// Replaced the custom fine-tune (quietnote-gemma-2b-q4f32_1-MLC) which had overfit
// on a narrow distribution and didn't follow the system prompt.
const MODEL_ID = "gemma-2-2b-it-q4f32_1-MLC";

/** Model reference for session metadata — use this instead of hardcoding */
export const MODEL_REF: ModelRef = {
  modelId: MODEL_ID,
  modelUrl: "https://huggingface.co/mlc-ai/gemma-2-2b-it-q4f32_1-MLC",
  localId: MODEL_ID,
};

export function useMLCEngine() {
  const [engine, setEngine] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [webgpuUnsupported, setWebgpuUnsupported] = useState<string | null>(null);

  const loadModel = async (_customModel?: ModelRef) => {
    // If we already created the engine once, we skip (you could add a forceReload flag if needed)
    if (engine) return engine;

    // Check WebGPU support before attempting model load
    const gpuStatus = await checkWebGPUSupport();
    if (!gpuStatus.supported) {
      setWebgpuUnsupported(gpuStatus.reason ?? "WebGPU is not supported in this browser.");
      return null;
    }

    setLoading(true);
    setLogs([]);

    try {
      // Use the built-in WebLLM model — no custom appConfig needed
      const e = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (s: InitProgressReport) => {
          setLogs(prev => [...prev, s.text ?? ""].slice(-200));
          if (s.progress !== undefined) setProgress(s.progress);
        },
      });
      setEngine(e);
      return e;
    } finally {
      setLoading(false);
    }
  };

  return { engine, loadModel, loading, logs, progress, webgpuUnsupported };
}