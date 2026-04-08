import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for TransformersJSEngine — verifying status lifecycle,
 * support detection, and error handling.
 *
 * We mock @huggingface/transformers since it requires a browser/WASM environment.
 */

// Mock the dynamic import of @huggingface/transformers
vi.mock("@huggingface/transformers", () => ({
  AutoTokenizer: {
    from_pretrained: vi.fn().mockResolvedValue({ fake: "tokenizer" }),
  },
  AutoModelForCausalLM: {
    from_pretrained: vi.fn().mockResolvedValue({
      generate: vi.fn().mockResolvedValue({}),
      dispose: vi.fn().mockResolvedValue(undefined),
    }),
  },
  TextStreamer: vi.fn().mockImplementation(() => ({})),
}));

import { TransformersJSEngine, TRANSFORMERSJS_MODEL_REF } from "../transformersjs-engine";

describe("TransformersJSEngine", () => {
  let engine: TransformersJSEngine;

  beforeEach(() => {
    engine = new TransformersJSEngine();
  });

  it("has name 'Transformers.js'", () => {
    expect(engine.name).toBe("Transformers.js");
  });

  it("starts with 'idle' status", () => {
    expect(engine.getStatus()).toBe("idle");
  });

  describe("checkSupport", () => {
    it("returns supported:true (WASM fallback always available)", async () => {
      const result = await engine.checkSupport();
      expect(result.supported).toBe(true);
    });

    it("detects WebGPU when navigator.gpu is available", async () => {
      const mockAdapter = { fake: "adapter" };
      const originalGpu = (navigator as any).gpu;
      (navigator as any).gpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };

      const freshEngine = new TransformersJSEngine();
      const result = await freshEngine.checkSupport();
      expect(result.supported).toBe(true);

      // Restore
      if (originalGpu === undefined) {
        delete (navigator as any).gpu;
      } else {
        (navigator as any).gpu = originalGpu;
      }
    });

    it("falls back to WASM when WebGPU adapter request fails", async () => {
      const originalGpu = (navigator as any).gpu;
      (navigator as any).gpu = {
        requestAdapter: vi.fn().mockRejectedValue(new Error("no adapter")),
      };

      const freshEngine = new TransformersJSEngine();
      const result = await freshEngine.checkSupport();
      expect(result.supported).toBe(true);

      if (originalGpu === undefined) {
        delete (navigator as any).gpu;
      } else {
        (navigator as any).gpu = originalGpu;
      }
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

  describe("model reference metadata", () => {
    it("has a valid modelId", () => {
      expect(TRANSFORMERSJS_MODEL_REF.modelId).toBeTruthy();
      expect(typeof TRANSFORMERSJS_MODEL_REF.modelId).toBe("string");
    });

    it("has a valid modelUrl", () => {
      expect(TRANSFORMERSJS_MODEL_REF.modelUrl).toContain("huggingface.co");
    });

    it("has a valid localId", () => {
      expect(TRANSFORMERSJS_MODEL_REF.localId).toBeTruthy();
      expect(typeof TRANSFORMERSJS_MODEL_REF.localId).toBe("string");
    });
  });
});
