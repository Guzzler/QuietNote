/**
 * Transformers.js v4 backend implementing the InferenceEngine interface.
 *
 * Uses @huggingface/transformers to run Gemma 4 E2B (ONNX Q4) locally
 * via WebGPU. WebGPU is required: the q4f16 export has no WASM/CPU kernel
 * path (GatherBlockQuantized), so there is no WASM fallback for this model.
 */

import type {
  InferenceEngine,
  EngineStatus,
  EngineCapability,
  LoadProgress,
  GenerateOptions,
} from "./types";

const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";

export class TransformersJSEngine implements InferenceEngine, EngineCapability {
  readonly name = "Transformers.js";
  private tokenizer: any = null;
  private model: any = null;
  private status: EngineStatus = "idle";
  private device: "webgpu" | "wasm" = "webgpu";

  getStatus(): EngineStatus {
    return this.status;
  }

  async checkSupport(): Promise<{ supported: boolean; reason?: string }> {
    // WebGPU is required: the ONNX q4f16 export uses GatherBlockQuantized,
    // which has no WASM/CPU kernel (verified 2026-07-12, R2 audit) — the
    // library's WASM fallback cannot load this model, so claiming WASM
    // support here would ship a broken backend.
    if (!(navigator as any).gpu) {
      return {
        supported: false,
        reason: "Your browser does not support the WebGPU API.",
      };
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        return {
          supported: false,
          reason:
            "WebGPU API is available but no compatible GPU adapter was found.",
        };
      }
      this.device = "webgpu";
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
      // Dynamic import to avoid loading the library at startup
      const { AutoTokenizer, AutoModelForCausalLM } = await import(
        "@huggingface/transformers"
      );

      onProgress?.({ progress: 0.05, message: "Loading tokenizer…" });

      this.tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);

      onProgress?.({ progress: 0.15, message: "Downloading model…" });

      this.model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
        dtype: "q4f16",
        device: this.device,
        progress_callback: (event: any) => {
          if (event.status === "progress" && event.total) {
            const pct = event.loaded / event.total;
            // Scale model download to 15%–90% of total progress
            const scaled = 0.15 + pct * 0.75;
            onProgress?.({
              progress: scaled,
              message: `Downloading model… ${Math.round(pct * 100)}%`,
            });
          }
        },
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
    options: GenerateOptions,
  ): AsyncIterable<string> {
    if (!this.tokenizer || !this.model) throw new Error("Engine not loaded");

    const { TextStreamer } = await import("@huggingface/transformers");

    // Apply the chat template to format messages for the model
    const inputs = this.tokenizer.apply_chat_template(messages, {
      tokenize: true,
      return_dict: true,
      add_generation_prompt: true,
    });

    // Set up streaming via a TextStreamer that pushes tokens to a queue
    const tokenQueue: string[] = [];
    let resolveNext: (() => void) | null = null;
    let done = false;

    const streamer = new TextStreamer(this.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        tokenQueue.push(text);
        if (resolveNext) {
          resolveNext();
          resolveNext = null;
        }
      },
    });

    // Start generation in the background
    const generatePromise = this.model
      .generate({
        ...inputs,
        max_new_tokens: options.maxTokens ?? 200,
        temperature: options.temperature ?? 0.6,
        repetition_penalty: options.repetitionPenalty ?? 1.3,
        do_sample: true,
        streamer,
      })
      .then(() => {
        done = true;
        if (resolveNext) {
          resolveNext();
          resolveNext = null;
        }
      });

    // Yield tokens as they arrive
    while (true) {
      if (tokenQueue.length > 0) {
        yield tokenQueue.shift()!;
      } else if (done) {
        break;
      } else {
        await new Promise<void>((resolve) => {
          resolveNext = resolve;
        });
      }
    }

    // Ensure generation is complete
    await generatePromise;
  }

  async resetContext(): Promise<void> {
    // Transformers.js doesn't maintain a persistent KV cache between calls
    // Each generate() call is independent
  }

  async dispose(): Promise<void> {
    if (this.model) {
      try {
        await this.model.dispose();
      } catch {
        // Best effort cleanup
      }
      this.model = null;
    }
    this.tokenizer = null;
    this.status = "disposed";
  }
}

/** Model reference metadata */
export const TRANSFORMERSJS_MODEL_REF = {
  modelId: MODEL_ID,
  modelUrl: `https://huggingface.co/${MODEL_ID}`,
  localId: "transformersjs-gemma-4-e2b",
} as const;
