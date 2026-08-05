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
import { MODEL_CONTEXT_LIMIT } from "../utils/tokenEstimator";

/** Must match the @mediapipe/tasks-genai version in package.json — the WASM
 * fileset is fetched from the CDN and an unpinned URL drifts to `latest`,
 * mismatching the bundled JS API. */
const TASKS_GENAI_VERSION = "0.10.29";

const MODEL_URL =
  "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.task";

/** Dev-only model override (M5a): lets a locally served fine-tuned artifact
 * (.task/.litertlm, e.g. `http://localhost:8080/model.litertlm`) replace the
 * default model without touching shipped code. Read from localStorage only in
 * dev builds — production always uses MODEL_URL. */
export const MODEL_URL_OVERRIDE_KEY = "quietnote-model-url-override";

export function resolveMediaPipeModelUrl(): string {
  if (import.meta.env.DEV) {
    try {
      const override = localStorage.getItem(MODEL_URL_OVERRIDE_KEY);
      if (override) {
        console.warn(
          `[quietnote] DEV model override active — loading MediaPipe model from ${override}`,
        );
        return override;
      }
    } catch {
      // storage unavailable — fall through to the default
    }
  }
  return MODEL_URL;
}

/** Cache Storage bucket for the ~3 GB .task file. WebLLM and Transformers.js
 * persist their models in Cache Storage (`webllm/*`, `transformers-cache`);
 * letting MediaPipe fetch `modelAssetPath` itself bypassed that entirely, so
 * the model re-downloaded whenever the HTTP cache evicted it. */
export const MEDIAPIPE_CACHE_NAME = "mediapipe-cache";

/** Sampling temperature baked into the graph at load time, matching the
 * app's send path (App.tsx sends temperature 0.6 on every generate). It is
 * fixed for the lifetime of the loaded task: `setOptions()` rebuilds the
 * inference session, and because the model is fed as a one-shot streamed
 * `modelAssetBuffer` (R1e), the rebuilt session has no model asset and every
 * subsequent generate fails with "No model asset provided" — the regression
 * that broke all MediaPipe sends between M0 (2026-07-13) and 2026-07-16. */
export const MEDIAPIPE_LOAD_TEMPERATURE = 0.6;

/**
 * Streaming filter that stops the reply at the first leaked Gemma turn-marker
 * fragment (M1c). The LiteRT runtime leaks markers into user-visible replies
 * and NOT as one clean token — the M1b transcripts
 * (docs/eval-runs/2026-07-16-m1b-mediapipe/report.md) show `<end_of_turn>`,
 * doubled `<end_of_turn><end_of_turn>`, and malformed `<end{turn>`,
 * `<end{end_of_turn>`, `<end of turn>`, `<end of_turn>` — so an exact-string
 * whitelist is insufficient. Instead, any occurrence of `<end` or
 * `<start_of_turn` is treated as a STOP: these never occur in legit replies
 * (markdown isn't rendered). A chunk-final fragment that could still grow
 * into a marker (plus the whitespace before it, so the stop point trims
 * clean) is held back until the next chunk disambiguates it; `flush()`
 * releases it if the stream ends and it turned out benign.
 */
export class TurnMarkerStreamFilter {
  private held = "";
  private stopped = false;

  /** True once a stop marker was seen — no further text will be emitted. */
  get isStopped(): boolean {
    return this.stopped;
  }

  private static readonly STOP_MARKERS = ["<end", "<start_of_turn"];

  /** Feed a raw chunk; returns the text now safe to show ("" if none yet). */
  push(chunk: string): string {
    if (this.stopped) return "";
    const text = this.held + chunk;
    this.held = "";

    let stopIdx = -1;
    for (const marker of TurnMarkerStreamFilter.STOP_MARKERS) {
      const i = text.indexOf(marker);
      if (i !== -1 && (stopIdx === -1 || i < stopIdx)) stopIdx = i;
    }
    if (stopIdx !== -1) {
      this.stopped = true;
      return text.slice(0, stopIdx).replace(/\s+$/, "");
    }

    // Hold back a trailing `<`-initiated fragment that is still a strict
    // prefix of a stop marker (max 13 chars: "<start_of_tur"), plus any
    // whitespace right before it — the marker (or the rest of it) may arrive
    // in the next chunk, and the stop point must trim clean.
    let holdIdx = text.length;
    const lt = text.lastIndexOf("<");
    if (lt !== -1) {
      const tail = text.slice(lt);
      if (
        TurnMarkerStreamFilter.STOP_MARKERS.some((m) => m.startsWith(tail))
      ) {
        holdIdx = lt;
      }
    }
    while (holdIdx > 0 && /\s/.test(text[holdIdx - 1])) holdIdx--;
    this.held = text.slice(holdIdx);
    return text.slice(0, holdIdx);
  }

  /** Stream ended: release anything still held (it turned out benign). */
  flush(): string {
    if (this.stopped) return "";
    const out = this.held;
    this.held = "";
    return out;
  }
}

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

  /**
   * Streams the model out of Cache Storage, downloading it into the cache
   * first on a miss. Owning the fetch (instead of handing MediaPipe
   * `modelAssetPath`) is what makes the model persist across visits and lets
   * us report real byte-level download progress instead of a synthetic jump.
   */
  private async getModelReader(
    onProgress?: (p: LoadProgress) => void,
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    // Resolved once per load; the URL is also the Cache Storage key, so an
    // overridden model (M5a dev-only) never collides with the default entry.
    const modelUrl = resolveMediaPipeModelUrl();

    const cache =
      typeof caches !== "undefined"
        ? await caches.open(MEDIAPIPE_CACHE_NAME)
        : null;

    const cached = cache ? await cache.match(modelUrl) : undefined;
    if (cached?.body) {
      onProgress?.({
        progress: 0.9,
        message: "Loading model from cache\u2026",
      });
      return cached.body.getReader();
    }

    const download = async () => {
      const res = await fetch(modelUrl);
      if (!res.ok || !res.body) {
        throw new Error(`Model download failed: HTTP ${res.status}`);
      }
      return res;
    };

    const res = await download();
    const total = Number(res.headers.get("Content-Length")) || 0;

    // Skip Cache Storage when the model can't fit in the origin's quota —
    // attempting the put would fail after consuming the stream and force a
    // second full download. Stream straight into the graph instead.
    let cacheHasRoom = cache !== null;
    if (cacheHasRoom && total > 0 && navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (
          est.quota !== undefined &&
          est.quota - (est.usage ?? 0) < total * 1.1
        ) {
          cacheHasRoom = false;
        }
      } catch {
        // estimate unavailable — try the put and rely on the failure fallback
      }
    }

    let received = 0;
    const netReader = res.body!.getReader();
    // Passthrough stream that counts bytes so the progress bar tracks the
    // actual download (0.1 \u2192 0.9 of the load) while Cache Storage consumes it.
    const counted = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await netReader.read();
        if (done) {
          controller.close();
          return;
        }
        received += value.byteLength;
        if (total > 0) {
          const frac = received / total;
          onProgress?.({
            progress: 0.1 + frac * 0.8,
            message: `Downloading model\u2026 ${Math.round(frac * 100)}% of ${(total / 1e9).toFixed(1)} GB`,
          });
        }
        controller.enqueue(value);
      },
      cancel(reason) {
        void netReader.cancel(reason);
      },
    });

    if (cache && cacheHasRoom) {
      try {
        await cache.put(
          modelUrl,
          new Response(counted, { headers: res.headers }),
        );
        const stored = await cache.match(modelUrl);
        if (stored?.body) return stored.body.getReader();
      } catch {
        // Quota exceeded or storage failure \u2014 fall through to direct
        // streaming below (re-fetch; the counted stream was consumed).
      }
      const retry = await download();
      if (!retry.body) throw new Error("Model download failed: empty body");
      return retry.body.getReader();
    }

    return counted.getReader();
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
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@${TASKS_GENAI_VERSION}/wasm`,
      );

      onProgress?.({
        progress: 0.1,
        message: "Downloading model\u2026",
      });

      const modelReader = await this.getModelReader(onProgress);

      onProgress?.({
        progress: 0.95,
        message: "Initializing model\u2026",
      });

      this.inference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetBuffer: modelReader,
          delegate: "GPU",
        },
        // MediaPipe's maxTokens is the TOTAL budget (input + output). The app
        // builds prompts up to MODEL_CONTEXT_LIMIT (system alone is ~1.6-1.9k
        // tokens); 1024 here made the first send overflow the graph with
        // INVALID_ARGUMENT: CalculatorGraph::Run() failed.
        maxTokens: MODEL_CONTEXT_LIMIT,
        topK: 40,
        temperature: MEDIAPIPE_LOAD_TEMPERATURE,
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

    // Per-call sampling options CANNOT reach this backend. The API has
    // no repetition-penalty knob (LlmInferenceOptions: maxTokens/topK/
    // temperature/randomSeed only), and temperature is fixed at load:
    // calling setOptions() here rebuilds the session and loses the streamed
    // model asset (see MEDIAPIPE_LOAD_TEMPERATURE). Anti-echo behavior must
    // come from the prompt/fine-tune.

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

    // MediaPipe uses callback-based streaming — wrap in async iterator.
    // Chunks pass through TurnMarkerStreamFilter (M1c): the runtime leaks
    // Gemma turn markers (incl. malformed variants) into replies; the filter
    // stops emission at the first `<end`/`<start_of_turn` fragment.
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

    const filter = new TurnMarkerStreamFilter();
    // Drain before checking `done` — the callback may deliver the final
    // chunks and `complete` in one burst, and they must still be emitted.
    for (;;) {
      while (chunks.length > 0 && !filter.isStopped) {
        const out = filter.push(chunks.shift()!);
        if (out) yield out;
      }
      if (done || filter.isStopped) break;
      await new Promise<void>((r) => {
        resolve = r;
      });
    }
    const tail = filter.flush();
    if (tail) yield tail;

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
