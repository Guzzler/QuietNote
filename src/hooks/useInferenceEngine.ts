import { useState, useRef, useCallback } from "react";
import { createEngine, WEBLLM_MODEL_REF, TRANSFORMERSJS_MODEL_REF } from "../inference";
import type { InferenceEngine, LoadProgress, RuntimeId } from "../inference";
import type { EngineCapability } from "../inference/types";
import type { ModelRef } from "../types";

const MODEL_REFS: Record<RuntimeId, ModelRef> = {
  webllm: WEBLLM_MODEL_REF,
  transformersjs: TRANSFORMERSJS_MODEL_REF,
  mediapipe: { modelId: "mediapipe", modelUrl: "", localId: "mediapipe" },
};

function getStoredRuntime(): RuntimeId {
  try {
    const stored = localStorage.getItem("quietnote-runtime");
    if (stored === "webllm" || stored === "transformersjs" || stored === "mediapipe") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "webllm";
}

export function useInferenceEngine() {
  const [runtimeId, setRuntimeId] = useState<RuntimeId>(getStoredRuntime);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [webgpuUnsupported, setWebgpuUnsupported] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<InferenceEngine | null>(null);
  const loadingRef = useRef(false);
  const currentRuntimeRef = useRef<RuntimeId>(getStoredRuntime());

  const clearError = useCallback(() => setError(null), []);

  const loadModel = useCallback(async () => {
    if (engineRef.current?.getStatus() === "ready" && currentRuntimeRef.current === runtimeId) {
      return engineRef.current;
    }
    if (loadingRef.current) return null;

    // If runtime changed, dispose old engine
    if (engineRef.current && currentRuntimeRef.current !== runtimeId) {
      await engineRef.current.dispose();
      engineRef.current = null;
    }

    // Create engine if we don't have one yet
    if (!engineRef.current) {
      engineRef.current = createEngine(runtimeId);
      currentRuntimeRef.current = runtimeId;
    }

    const engine = engineRef.current;

    // Check capability before loading (generic — works for any engine with checkSupport)
    if ("checkSupport" in engine) {
      const support = await (engine as EngineCapability).checkSupport();
      if (!support.supported) {
        setWebgpuUnsupported(support.reason ?? "This runtime is not supported in your browser.");
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
  }, [runtimeId]);

  const switchRuntime = useCallback(async (newRuntime: RuntimeId) => {
    if (newRuntime === currentRuntimeRef.current && engineRef.current?.getStatus() === "ready") {
      return;
    }

    // Dispose existing engine
    if (engineRef.current) {
      await engineRef.current.dispose();
      engineRef.current = null;
    }

    // Reset state
    setProgress(0);
    setLogs([]);
    setError(null);
    setWebgpuUnsupported(null);

    // Persist preference
    try {
      localStorage.setItem("quietnote-runtime", newRuntime);
    } catch {
      // localStorage unavailable
    }

    setRuntimeId(newRuntime);
    currentRuntimeRef.current = newRuntime;
  }, []);

  const modelRef = MODEL_REFS[runtimeId] ?? WEBLLM_MODEL_REF;

  return {
    engine: engineRef.current,
    loadModel,
    loading,
    logs,
    progress,
    webgpuUnsupported,
    error,
    clearError,
    runtimeId,
    switchRuntime,
    modelRef,
  };
}
