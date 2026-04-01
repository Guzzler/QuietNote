import { useState, useRef } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const engineRef = useRef<any | null>(null);

  const clearError = () => setError(null);

  const loadModel = async (_customModel?: ModelRef) => {
    // Guard against concurrent loads using a ref (not state) to avoid stale closures
    if (engineRef.current) return engineRef.current;
    if (loadingRef.current) return null;

    // Check WebGPU support before attempting model load
    const gpuStatus = await checkWebGPUSupport();
    if (!gpuStatus.supported) {
      setWebgpuUnsupported(gpuStatus.reason ?? "WebGPU is not supported in this browser.");
      return null;
    }

    loadingRef.current = true;
    setLoading(true);
    setLogs([]);
    setError(null);

    try {
      // Use the built-in WebLLM model — no custom appConfig needed
      const e = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (s: InitProgressReport) => {
          setLogs(prev => [...prev, s.text ?? ""].slice(-200));
          if (s.progress !== undefined) setProgress(s.progress);
        },
      });
      engineRef.current = e;
      setEngine(e);
      return e;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Map technical errors to user-friendly messages
      if (message.includes("memory") || message.includes("OOM")) {
        setError("Not enough memory to load the model. Try closing other tabs and retrying.");
      } else if (message.includes("network") || message.includes("fetch") || message.includes("Failed to fetch")) {
        setError("Could not download the model. Check your internet connection and try again.");
      } else if (message.includes("WASM") || message.includes("wasm") || message.includes("compile")) {
        setError("Your browser couldn't compile the model. Try updating your browser or using Chrome.");
      } else {
        setError("Something went wrong loading the model. Please try again.");
      }
      console.error("[useMLCEngine] Model load failed:", err);
      return null;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  return { engine, loadModel, loading, logs, progress, webgpuUnsupported, error, clearError };
}