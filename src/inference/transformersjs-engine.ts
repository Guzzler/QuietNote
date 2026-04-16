/**
 * Transformers.js v4 backend implementing the InferenceEngine interface.
 *
 * Uses @huggingface/transformers to run Gemma 4 E2B (ONNX Q4) locally
 * via WebGPU (preferred) or WASM fallback.
 */

import type {
  InferenceEngine,
  EngineStatus,
  EngineCapability,
  LoadProgress,
  GenerateOptions,
} from "./types";

const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";

// Gemma chat template for tokenizers that don't include one
const GEMMA_CHAT_TEMPLATE =
  "{% for message in messages %}" +
  "{% if message['role'] == 'user' %}" +
  "<start_of_turn>user\n{{ message['content'] }}<end_of_turn>\n" +
  "{% elif message['role'] == 'assistant' %}" +
  "<start_of_turn>model\n{{ message['content'] }}<end_of_turn>\n" +
  "{% elif message['role'] == 'system' %}" +
  "<start_of_turn>user\n{{ message['content'] }}<end_of_turn>\n" +
  "{% endif %}" +
  "{% endfor %}" +
  "{% if add_generation_prompt %}<start_of_turn>model\n{% endif %}";

export class TransformersJSEngine implements InferenceEngine, EngineCapability {
  readonly name = "Transformers.js";
  private tokenizer: any = null;
  private model: any = null;
  private status: EngineStatus = "idle";
  private device: "webgpu" | "wasm" = "wasm";

  getStatus(): EngineStatus {
    return this.status;
  }

  async checkSupport(): Promise<{ supported: boolean; reason?: string }> {
    // Transformers.js supports both WebGPU and WASM — always supported
    // but we prefer WebGPU when available
    if ((navigator as any).gpu) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          this.device = "webgpu";
          return { supported: true };
        }
      } catch {
        // Fall through to WASM
      }
    }
    this.device = "wasm";
    return { supported: true };
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

      // Some ONNX community models don't include a chat_template in their
      // tokenizer config. Set the Gemma template if missing.
      if (!this.tokenizer.chat_template) {
        this.tokenizer.chat_template = GEMMA_CHAT_TEMPLATE;
      }

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

    // Resolve the EOS token ID(s) for Gemma — includes <end_of_turn> (107)
    // and the standard EOS token so the model stops after its turn
    const eosTokenIds: number[] = [];
    const eosId = this.tokenizer.eos_token_id;
    if (typeof eosId === "number") eosTokenIds.push(eosId);
    else if (Array.isArray(eosId)) eosTokenIds.push(...eosId);
    // Encode <end_of_turn> to get its token ID — critical for stopping generation
    const endOfTurnIds = this.tokenizer.encode("<end_of_turn>", { add_special_tokens: false });
    for (const id of endOfTurnIds) {
      if (typeof id === "number" && !eosTokenIds.includes(id)) {
        eosTokenIds.push(id);
      }
    }

    // Set up streaming via a TextStreamer that pushes tokens to a queue
    const tokenQueue: string[] = [];
    let resolveNext: (() => void) | null = null;
    let done = false;
    let hitStop = false;

    const streamer = new TextStreamer(this.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        if (hitStop) return;

        // Check for leaked special tokens and stop/strip them
        const stopIdx = text.indexOf("<end_of_turn>");
        if (stopIdx !== -1) {
          hitStop = true;
          const clean = text.slice(0, stopIdx);
          if (clean) tokenQueue.push(clean);
          done = true;
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
          return;
        }

        // Also check for <start_of_turn> which means the model went past its turn
        const startIdx = text.indexOf("<start_of_turn>");
        if (startIdx !== -1) {
          hitStop = true;
          const clean = text.slice(0, startIdx);
          if (clean) tokenQueue.push(clean);
          done = true;
          if (resolveNext) {
            resolveNext();
            resolveNext = null;
          }
          return;
        }

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
        eos_token_id: eosTokenIds.length > 0 ? eosTokenIds : undefined,
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
