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
