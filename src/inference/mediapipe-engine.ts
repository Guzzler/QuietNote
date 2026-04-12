/**
 * MediaPipe LLM Inference backend implementing the InferenceEngine interface.
 *
 * Uses @mediapipe/tasks-genai to run Gemma 4 E2B locally via WebGPU.
 * Google AI Edge's official on-device LLM path for web browsers.
 *
 * Note: Gemma 4 E2B has a known issue (mediapipe#6270) — memory access out of
 * bounds on some Chrome/GPU combos. The existing error-recovery UI handles this.
 */

import type {
  InferenceEngine,
  EngineStatus,
  EngineCapability,
  LoadProgress,
  GenerateOptions,
} from "./types";

const MODEL_URL =
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task";

export class MediaPipeEngine implements InferenceEngine, EngineCapability {
  readonly name = "MediaPipe";
  private inference: import("@mediapipe/tasks-genai").LlmInference | null =
    null;
  private status: EngineStatus = "idle";

  getStatus(): EngineStatus {
    return this.status;
  }

  async checkSupport(): Promise<{ supported: boolean; reason?: string }> {
    // MediaPipe LLM Inference requires WebGPU — no WASM fallback for LLM tasks
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !(navigator as any).gpu
    ) {
      return {
        supported: false,
        reason:
          "MediaPipe LLM Inference requires WebGPU. Try Chrome 121+ or Edge 121+.",
      };
    }

    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        return {
          supported: false,
          reason: "No WebGPU adapter found. Your GPU may not be supported.",
        };
      }
      return { supported: true };
    } catch {
      return {
        supported: false,
        reason: "WebGPU adapter request failed.",
      };
    }
  }

  async load(onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.status === "ready" || this.status === "loading") return;

    this.status = "loading";
    try {
      const { FilesetResolver, LlmInference } = await import(
        "@mediapipe/tasks-genai"
      );

      onProgress?.({
        progress: 0.05,
        message: "Initializing MediaPipe runtime\u2026",
      });

      // Resolve WASM fileset for GenAI tasks
      const genaiFileset = await FilesetResolver.forGenAiTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm",
      );

      onProgress?.({
        progress: 0.1,
        message: "Downloading model\u2026",
      });

      this.inference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        maxTokens: 1024,
        topK: 40,
        temperature: 0.8,
        randomSeed: Date.now(),
      });

      onProgress?.({ progress: 1, message: "Ready" });
      this.status = "ready";
    } catch (err) {
      this.status = "error";
      throw err;
    }
  }

  async *generate(
    messages: { role: string; content: string }[],
    _options: GenerateOptions,
  ): AsyncIterable<string> {
    if (!this.inference) throw new Error("Engine not loaded");

    // Build prompt from messages using Gemma turn markers
    const prompt = messages
      .map((m) => {
        if (m.role === "system")
          return `<start_of_turn>user\n${m.content}<end_of_turn>`;
        if (m.role === "user")
          return `<start_of_turn>user\n${m.content}<end_of_turn>`;
        return `<start_of_turn>model\n${m.content}<end_of_turn>`;
      })
      .join("\n") + "\n<start_of_turn>model\n";

    // MediaPipe uses callback-based streaming — wrap in async iterator
    const chunks: string[] = [];
    let resolve: (() => void) | null = null;
    let done = false;

    const resultPromise = this.inference.generateResponse(
      prompt,
      (partialResult: string, complete: boolean) => {
        chunks.push(partialResult);
        if (complete) done = true;
        if (resolve) {
          resolve();
          resolve = null;
        }
      },
    );

    while (!done) {
      if (chunks.length === 0) {
        await new Promise<void>((r) => {
          resolve = r;
        });
      }
      while (chunks.length > 0) {
        yield chunks.shift()!;
      }
    }

    await resultPromise;
  }

  async resetContext(): Promise<void> {
    // MediaPipe LlmInference doesn't maintain persistent KV cache between calls
  }

  async dispose(): Promise<void> {
    if (this.inference) {
      this.inference.close();
      this.inference = null;
    }
    this.status = "disposed";
  }
}

/** Model reference metadata */
export const MEDIAPIPE_MODEL_REF = {
  modelId: "gemma-4-e2b-mediapipe",
  modelUrl: MODEL_URL,
  localId: "mediapipe-gemma-4-e2b",
} as const;
