/**
 * WebLLM backend implementing the InferenceEngine interface.
 *
 * Wraps @mlc-ai/web-llm so the rest of the app never imports it directly.
 */

import { CreateMLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";
import type {
  InferenceEngine,
  EngineStatus,
  EngineCapability,
  LoadProgress,
  GenerateOptions,
} from "./types";

const MODEL_ID = "gemma-2-2b-it-q4f32_1-MLC";

export class WebLLMEngine implements InferenceEngine, EngineCapability {
  readonly name = "WebLLM";
  private engine: any = null;
  private status: EngineStatus = "idle";

  getStatus(): EngineStatus {
    return this.status;
  }

  async checkSupport(): Promise<{ supported: boolean; reason?: string }> {
    if (!(navigator as any).gpu) {
      return { supported: false, reason: "Your browser does not support the WebGPU API." };
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, reason: "WebGPU API is available but no compatible GPU adapter was found." };
      }
      return { supported: true };
    } catch (err) {
      return {
        supported: false,
        reason: `WebGPU adapter request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async load(onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.status === "ready" || this.status === "loading") return;

    this.status = "loading";
    try {
      this.engine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (s: InitProgressReport) => {
          onProgress?.({
            progress: s.progress ?? 0,
            message: s.text ?? "",
          });
        },
      });
      this.status = "ready";
    } catch (err) {
      this.status = "error";
      throw err;
    }
  }

  async *generate(
    messages: { role: string; content: string }[],
    options: GenerateOptions,
  ): AsyncIterable<string> {
    if (!this.engine) throw new Error("Engine not loaded");

    // Reset KV cache before each generation to avoid stale state
    await this.engine.resetChat();

    const stream = await this.engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 200,
      repetition_penalty: options.repetitionPenalty ?? 1.3,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta =
        chunk?.choices?.[0]?.delta?.content ??
        (chunk as any)?.output_text ??
        "";
      if (delta) yield delta;
    }
  }

  async resetContext(): Promise<void> {
    if (this.engine) {
      await this.engine.resetChat();
    }
  }

  async dispose(): Promise<void> {
    if (this.engine) {
      // web-llm doesn't expose a dispose() yet; clear the reference
      this.engine = null;
    }
    this.status = "disposed";
  }
}

/** Model reference metadata — mirrors the old MODEL_REF export */
export const WEBLLM_MODEL_REF = {
  modelId: MODEL_ID,
  modelUrl: "https://huggingface.co/mlc-ai/gemma-2-2b-it-q4f32_1-MLC",
  localId: MODEL_ID,
} as const;
