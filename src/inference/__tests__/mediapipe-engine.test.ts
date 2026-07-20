import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for MediaPipeEngine — verifying status lifecycle,
 * support detection, and error handling.
 *
 * We mock @mediapipe/tasks-genai since it requires a browser/WebGPU environment.
 */

// Mock the dynamic import of @mediapipe/tasks-genai
vi.mock("@mediapipe/tasks-genai", () => ({
  FilesetResolver: {
    forGenAiTasks: vi.fn().mockResolvedValue({ fake: "fileset" }),
  },
  LlmInference: {
    createFromOptions: vi.fn().mockResolvedValue({
      generateResponse: vi.fn().mockResolvedValue("test response"),
      close: vi.fn(),
      isIdle: true,
    }),
  },
}));

import { FilesetResolver, LlmInference } from "@mediapipe/tasks-genai";
import {
  MediaPipeEngine,
  MEDIAPIPE_MODEL_REF,
  MEDIAPIPE_CACHE_NAME,
  MODEL_URL_OVERRIDE_KEY,
  resolveMediaPipeModelUrl,
  TurnMarkerStreamFilter,
} from "../mediapipe-engine";
import { MODEL_CONTEXT_LIMIT } from "../../utils/tokenEstimator";
import pkg from "../../../package.json";

const MODEL_BYTES = new Uint8Array([1, 2, 3, 4]);

function fakeModelResponse() {
  return new Response(MODEL_BYTES.slice().buffer, {
    status: 200,
    headers: { "Content-Length": String(MODEL_BYTES.length) },
  });
}

/** Minimal in-memory CacheStorage double — put() drains the response body
 * like the real thing, match() returns a fresh streamable Response. */
function makeFakeCaches() {
  const store = new Map<string, ArrayBuffer>();
  const cache = {
    match: vi.fn(async (url: string) =>
      store.has(url) ? new Response(store.get(url)!) : undefined,
    ),
    put: vi.fn(async (url: string, res: Response) => {
      store.set(url, await res.arrayBuffer());
    }),
  };
  const cachesMock = { open: vi.fn(async () => cache) };
  return { cachesMock, cache, store };
}

describe("MediaPipeEngine", () => {
  let engine: MediaPipeEngine;
  let fakeCaches: ReturnType<typeof makeFakeCaches>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    engine = new MediaPipeEngine();
    fakeCaches = makeFakeCaches();
    fetchMock = vi.fn(async () => fakeModelResponse());
    vi.stubGlobal("caches", fakeCaches.cachesMock);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has name 'MediaPipe'", () => {
    expect(engine.name).toBe("MediaPipe");
  });

  it("starts with 'idle' status", () => {
    expect(engine.getStatus()).toBe("idle");
  });

  describe("checkSupport", () => {
    it("returns supported:false when no WebGPU (default test env)", async () => {
      const freshEngine = new MediaPipeEngine();
      const result = await freshEngine.checkSupport();
      expect(result.supported).toBe(false);
      expect(result.reason).toContain("WebGPU");
    });
  });

  describe("dispose", () => {
    it("sets status to 'disposed'", async () => {
      await engine.dispose();
      expect(engine.getStatus()).toBe("disposed");
    });
  });

  describe("generate", () => {
    it("throws when engine is not loaded", async () => {
      const generator = engine.generate(
        [{ role: "user", content: "hello" }],
        { temperature: 0.6 },
      );

      await expect(async () => {
        for await (const _token of generator) {
          // Should throw before yielding
        }
      }).rejects.toThrow("Engine not loaded");
    });
  });

  describe("load options (R1d regression — first send overflowed the graph)", () => {
    it("budgets maxTokens for the app's full prompt (input + output), not 1024", async () => {
      await engine.load();
      const options = vi.mocked(LlmInference.createFromOptions).mock
        .calls[0][1] as { maxTokens?: number };
      expect(options.maxTokens).toBeGreaterThanOrEqual(MODEL_CONTEXT_LIMIT);
    });

    it("pins the CDN wasm fileset to the installed @mediapipe/tasks-genai version", async () => {
      await engine.load();
      const filesetUrl = vi.mocked(FilesetResolver.forGenAiTasks).mock
        .calls[0][0] as string;
      const installed = (
        pkg.dependencies["@mediapipe/tasks-genai"] as string
      ).replace(/^[\^~]/, "");
      expect(filesetUrl).toContain(`@mediapipe/tasks-genai@${installed}/`);
    });
  });

  describe("model caching (R1e — .task must persist in Cache Storage)", () => {
    it("passes a stream reader as modelAssetBuffer instead of modelAssetPath", async () => {
      await engine.load();
      const options = vi.mocked(LlmInference.createFromOptions).mock.calls.at(
        -1,
      )![1] as {
        baseOptions?: { modelAssetPath?: string; modelAssetBuffer?: unknown };
      };
      expect(options.baseOptions?.modelAssetPath).toBeUndefined();
      expect(options.baseOptions?.modelAssetBuffer).toBeDefined();
      expect(
        typeof (options.baseOptions?.modelAssetBuffer as { read?: unknown })
          .read,
      ).toBe("function");
    });

    it("cache miss: downloads once and writes the model into mediapipe-cache", async () => {
      await engine.load();
      expect(fakeCaches.cachesMock.open).toHaveBeenCalledWith(
        MEDIAPIPE_CACHE_NAME,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(MEDIAPIPE_MODEL_REF.modelUrl);
      expect(fakeCaches.cache.put).toHaveBeenCalledTimes(1);
      expect(fakeCaches.cache.put.mock.calls[0][0]).toBe(
        MEDIAPIPE_MODEL_REF.modelUrl,
      );
      expect(fakeCaches.store.has(MEDIAPIPE_MODEL_REF.modelUrl)).toBe(true);
    });

    it("cache hit: loads without any network fetch", async () => {
      fakeCaches.store.set(
        MEDIAPIPE_MODEL_REF.modelUrl,
        MODEL_BYTES.slice().buffer,
      );
      await engine.load();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(fakeCaches.cache.put).not.toHaveBeenCalled();
    });

    it("reports real download progress from Content-Length, not a synthetic jump", async () => {
      const progress: { progress: number; message: string }[] = [];
      await engine.load((p) => progress.push(p));
      const download = progress.filter((p) => p.message.includes("% of"));
      expect(download.length).toBeGreaterThan(0);
      expect(download.at(-1)!.message).toContain("100%");
      expect(download.at(-1)!.progress).toBeCloseTo(0.9, 5);
    });

    it("skips the cache put when quota can't hold the model (no double download)", async () => {
      const storage = {
        estimate: vi.fn(async () => ({
          quota: MODEL_BYTES.length,
          usage: 1,
        })),
      };
      Object.defineProperty(navigator, "storage", {
        value: storage,
        configurable: true,
      });
      try {
        await engine.load();
        expect(fakeCaches.cache.put).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(engine.getStatus()).toBe("ready");
      } finally {
        Reflect.deleteProperty(navigator, "storage");
      }
    });

    it("falls back to direct streaming when cache.put fails (quota)", async () => {
      fakeCaches.cache.put.mockRejectedValueOnce(
        new DOMException("quota", "QuotaExceededError"),
      );
      await engine.load();
      // first fetch was consumed by the failed put → re-fetch for the graph
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(engine.getStatus()).toBe("ready");
    });
  });

  describe("sampling parity (M0 — GenerateOptions must reach the task)", () => {
    function makeStreamingInference() {
      return {
        generateResponse: vi.fn(
          (_prompt: string, cb: (part: string, done: boolean) => void) => {
            cb("hello", true);
            return Promise.resolve("hello");
          },
        ),
        setOptions: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        isIdle: true,
      };
    }

    async function drain(gen: AsyncIterable<string>) {
      const out: string[] = [];
      for await (const t of gen) out.push(t);
      return out.join("");
    }

    it("NEVER calls setOptions during generate — rebuilding the session loses the streamed model asset", async () => {
      // Regression guard (2026-07-16): M0 called setOptions({temperature})
      // on the first send (app 0.6 vs loaded 0.8). MediaPipe rebuilds the
      // inference session on setOptions, and the model was fed as a one-shot
      // streamed modelAssetBuffer (R1e), so every MediaPipe send failed with
      // "[newSession] Inference failed: Error: No model asset provided."
      const inference = makeStreamingInference();
      vi.mocked(LlmInference.createFromOptions).mockResolvedValueOnce(
        inference as never,
      );
      await engine.load();

      await drain(
        engine.generate([{ role: "user", content: "hi" }], {
          temperature: 0.6,
        }),
      );
      await drain(
        engine.generate([{ role: "user", content: "hi again" }], {
          temperature: 0.9,
        }),
      );
      expect(inference.setOptions).not.toHaveBeenCalled();
    });

    it("bakes the app send-path temperature (0.6) into the graph at load", async () => {
      const inference = makeStreamingInference();
      vi.mocked(LlmInference.createFromOptions).mockResolvedValueOnce(
        inference as never,
      );
      await engine.load();
      const opts = vi.mocked(LlmInference.createFromOptions).mock.calls.at(-1)![1];
      expect(opts.temperature).toBe(0.6);
    });

    it("documents that the API has no repetition-penalty knob (source guard)", async () => {
      // LlmInferenceOptions has maxTokens/topK/temperature/randomSeed only —
      // the app's repetitionPenalty CANNOT reach this backend. The engine
      // must say so where the options are handled.
      const { readFileSync } = await import("node:fs");
      const { fileURLToPath } = await import("node:url");
      const source = readFileSync(
        fileURLToPath(new URL("../mediapipe-engine.ts", import.meta.url)),
        "utf-8",
      );
      expect(source).toMatch(/no repetition-penalty knob/i);
    });
  });

  describe("turn-marker leak filter (M1c — LiteRT leaks Gemma markers into replies)", () => {
    /** Run chunks through the filter the way generate() does. */
    function filterChunks(chunks: string[]): string {
      const filter = new TurnMarkerStreamFilter();
      const out: string[] = [];
      for (const c of chunks) {
        if (filter.isStopped) break;
        const t = filter.push(c);
        if (t) out.push(t);
      }
      const tail = filter.flush();
      if (tail) out.push(tail);
      return out.join("");
    }

    // Every variant observed in the M1b transcripts
    // (docs/eval-runs/2026-07-16-m1b-mediapipe/report.md).
    it.each([
      ["<end_of_turn>"],
      ["<end_of_turn><end_of_turn>"],
      ["<end{turn>"],
      ["<end{end_of_turn>"],
      ["<end of turn>"],
      ["<end of_turn>"],
      ["<start_of_turn>user"],
    ])("stops at observed leak variant %j and trims trailing whitespace", (marker) => {
      expect(filterChunks([`That sounds heavy. ${marker}`])).toBe(
        "That sounds heavy.",
      );
    });

    it("stops when the marker is split across two chunks", () => {
      expect(filterChunks(["It makes sense you're tired.<end", "_of_turn>"])).toBe(
        "It makes sense you're tired.",
      );
    });

    it("holds a partial marker prefix at chunk end until the next chunk completes it", () => {
      // "<en" is shorter than the "<end" stop fragment — the filter must
      // hold it back instead of showing it, then stop when the rest arrives.
      expect(filterChunks(["It makes sense you're tired.<en", "d_of_turn>"])).toBe(
        "It makes sense you're tired.",
      );
    });

    it("drops everything after the first marker, even across later chunks", () => {
      expect(
        filterChunks(["A reply.", " <end_of_turn>", "leaked continuation"]),
      ).toBe("A reply.");
    });

    it("passes a benign '<' in reply text through unchanged", () => {
      expect(filterChunks(["your worry <that you failed> isn't the whole story"])).toBe(
        "your worry <that you failed> isn't the whole story",
      );
    });

    it("flushes a held benign '<e...' fragment when the stream ends", () => {
      // "<e" is a marker prefix at chunk end — held back, then released
      // by flush() because no more chunks disambiguated it.
      expect(filterChunks(["score was 3", "<e"])).toBe("score was 3<e");
    });

    it("emits nothing extra for a marker-only final chunk", () => {
      expect(filterChunks(["You showed up for yourself today.", "<end_of_turn>"])).toBe(
        "You showed up for yourself today.",
      );
    });

    it("generate() applies the filter to the streamed reply", async () => {
      const inference = {
        generateResponse: vi.fn(
          (_prompt: string, cb: (part: string, done: boolean) => void) => {
            cb("Thanks for writing", false);
            cb(" that down.", false);
            cb("<end", false);
            cb("_of_turn>", true);
            return Promise.resolve("");
          },
        ),
        close: vi.fn(),
        isIdle: true,
      };
      vi.mocked(LlmInference.createFromOptions).mockResolvedValueOnce(
        inference as never,
      );
      await engine.load();
      const out: string[] = [];
      for await (const t of engine.generate(
        [{ role: "user", content: "hi" }],
        { temperature: 0.6 },
      )) {
        out.push(t);
      }
      expect(out.join("")).toBe("Thanks for writing that down.");
    });
  });

  describe("dev-only model URL override (M5a)", () => {
    const OVERRIDE_URL = "http://localhost:8080/quietnote-m3.litertlm";

    // This suite runs in a node environment — provide a minimal localStorage
    // (vi.stubGlobal is undone by the outer afterEach's unstubAllGlobals).
    beforeEach(() => {
      const store = new Map<string, string>();
      vi.stubGlobal("localStorage", {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      });
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns the default model URL when no override is set", () => {
      expect(resolveMediaPipeModelUrl()).toBe(MEDIAPIPE_MODEL_REF.modelUrl);
    });

    it("returns the override URL in dev builds when set", () => {
      // vitest runs with import.meta.env.DEV === true, same as `npm run dev`
      localStorage.setItem(MODEL_URL_OVERRIDE_KEY, OVERRIDE_URL);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        expect(resolveMediaPipeModelUrl()).toBe(OVERRIDE_URL);
        // The override must announce itself — silent model swaps are not ok
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining("model override active"),
        );
      } finally {
        warn.mockRestore();
      }
    });

    it("NEVER honors the override outside dev builds (production safety)", () => {
      localStorage.setItem(MODEL_URL_OVERRIDE_KEY, OVERRIDE_URL);
      vi.stubEnv("DEV", false);
      expect(resolveMediaPipeModelUrl()).toBe(MEDIAPIPE_MODEL_REF.modelUrl);
    });

    it("load() fetches and caches under the override URL, not the default", async () => {
      localStorage.setItem(MODEL_URL_OVERRIDE_KEY, OVERRIDE_URL);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        await engine.load();
        expect(fetchMock).toHaveBeenCalledWith(OVERRIDE_URL);
        expect(fakeCaches.store.has(OVERRIDE_URL)).toBe(true);
        expect(fakeCaches.store.has(MEDIAPIPE_MODEL_REF.modelUrl)).toBe(false);
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe("model reference metadata", () => {
    it("has a valid modelId", () => {
      expect(MEDIAPIPE_MODEL_REF.modelId).toBeTruthy();
      expect(typeof MEDIAPIPE_MODEL_REF.modelId).toBe("string");
    });

    it("has a valid modelUrl pointing to HuggingFace", () => {
      expect(MEDIAPIPE_MODEL_REF.modelUrl).toContain(
        "huggingface.co",
      );
    });

    it("has a valid localId", () => {
      expect(MEDIAPIPE_MODEL_REF.localId).toBeTruthy();
      expect(typeof MEDIAPIPE_MODEL_REF.localId).toBe("string");
    });
  });
});
