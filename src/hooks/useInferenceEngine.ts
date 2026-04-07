import { useState, useRef, useCallback } from "react";
import { createEngine, WEBLLM_MODEL_REF } from "../inference";
import type { InferenceEngine, LoadProgress } from "../inference";
import { WebLLMEngine } from "../inference/webllm-engine";
import type { ModelRef } from "../types";

export const MODEL_REF: ModelRef = WEBLLM_MODEL_REF;

export function useInferenceEngine() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [webgpuUnsupported, setWebgpuUnsupported] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<InferenceEngine | null>(null);
  const loadingRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const loadModel = useCallback(async () => {
    if (engineRef.current?.getStatus() === "ready") return engineRef.current;
    if (loadingRef.current) return null;

    // Create engine if we don't have one yet
    if (!engineRef.current) {
      engineRef.current = createEngine("webllm");
    }

    const engine = engineRef.current;

    // Check capability before loading
    if (engine instanceof WebLLMEngine) {
      const support = await engine.checkSupport();
      if (!support.supported) {
        setWebgpuUnsupported(support.reason ?? "WebGPU is not supported in this browser.");
        return null;
      }
    }

    loadingRef.current = true;
    setLoading(true);
    setLogs([]);
    setError(null);

    try {
      await engine.load((p: LoadProgress) => {
        setLogs((prev) => [...prev, p.message].slice(-200));
        setProgress(p.progress);
      });
      return engine;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("memory") || message.includes("OOM")) {
        setError("Not enough memory to load the model. Try closing other tabs and retrying.");
      } else if (message.includes("network") || message.includes("fetch") || message.includes("Failed to fetch")) {
        setError("Could not download the model. Check your internet connection and try again.");
      } else if (message.includes("WASM") || message.includes("wasm") || message.includes("compile")) {
        setError("Your browser couldn't compile the model. Try updating your browser or using Chrome.");
      } else {
        setError("Something went wrong loading the model. Please try again.");
      }
      console.error("[useInferenceEngine] Model load failed:", err);
      return null;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  return { engine: engineRef.current, loadModel, loading, logs, progress, webgpuUnsupported, error, clearError };
}
