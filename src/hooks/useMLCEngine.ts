import { useState } from "react";
import { CreateMLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";

import type { ModelRef } from "../types";
import { checkWebGPUSupport } from "../utils/webgpuCheck";

// Fine-tuned Quietnote Gemma 2B model — single source of truth for model identity
const CUSTOM_MODEL_ID = "quietnote-gemma-2b-q4f32_1-MLC";
const CUSTOM_MODEL_URL = "https://huggingface.co/Sharangp/quietnote-gemma-2b-q4f32_1-MLC/resolve/main/";

/** Model reference for session metadata — use this instead of hardcoding */
export const MODEL_REF: ModelRef = {
  modelId: CUSTOM_MODEL_ID,
  modelUrl: "https://huggingface.co/Sharangp/quietnote-gemma-2b-q4f32_1-MLC",
  localId: CUSTOM_MODEL_ID,
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

    const appConfig = {
      model_list: [
        {
          model: CUSTOM_MODEL_URL,
          model_id: CUSTOM_MODEL_ID,
          model_lib:
            'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/gemma-2b-it-q4f32_1-ctx4k_cs1k-webgpu.wasm',
        },
      ],
    };

    try {
      const e = await CreateMLCEngine(CUSTOM_MODEL_ID, {
        appConfig: appConfig,
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