/**
 * Runtime adapter interface for local LLM inference.
 *
 * Abstracts over WebLLM, MediaPipe, Transformers.js, and future backends
 * so the app can swap runtimes without rewriting chat/session logic.
 */

export type EngineStatus = "idle" | "loading" | "ready" | "error" | "disposed";

export interface LoadProgress {
  progress: number; // 0–1
  message: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  repetitionPenalty?: number;
  stream?: boolean;
}

export interface InferenceEngine {
  /** Human-readable name of the backend (e.g. "WebLLM", "MediaPipe") */
  readonly name: string;

  /** Download / initialise the model. Calls onProgress during download. */
  load(onProgress?: (progress: LoadProgress) => void): Promise<void>;

  /**
   * Run chat completion and yield tokens as they arrive.
   * `messages` should include the system instruction as the first entry.
   */
  generate(
    messages: { role: string; content: string }[],
    options: GenerateOptions,
  ): AsyncIterable<string>;

  /** Clear the KV cache so the next generate() starts fresh. */
  resetContext(): Promise<void>;

  /** Release all resources (WASM memory, GPU buffers, etc.). */
  dispose(): Promise<void>;

  /** Current lifecycle state. */
  getStatus(): EngineStatus;
}

export interface EngineCapability {
  /** Does this runtime work in the current browser? */
  checkSupport(): Promise<{ supported: boolean; reason?: string }>;
}

export type RuntimeId = "webllm" | "mediapipe" | "transformersjs";
