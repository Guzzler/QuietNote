import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for WebLLMEngine — verifying status lifecycle,
 * support detection, and error handling.
 *
 * We mock @mlc-ai/web-llm since it requires a browser/WebGPU environment.
 */

// Mock @mlc-ai/web-llm
vi.mock("@mlc-ai/web-llm", () => ({
  CreateMLCEngine: vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue([]),
      },
    },
    resetChat: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { WebLLMEngine, WEBLLM_MODEL_REF } from "../webllm-engine";

describe("WebLLMEngine", () => {
  let engine: WebLLMEngine;

  beforeEach(() => {
    engine = new WebLLMEngine();
  });

  it("has name 'WebLLM'", () => {
    expect(engine.name).toBe("WebLLM");
  });

  it("starts with 'idle' status", () => {
    expect(engine.getStatus()).toBe("idle");
  });

  describe("checkSupport", () => {
    it("returns supported:false when no WebGPU (default test env)", async () => {
      const result = await engine.checkSupport();
      expect(result.supported).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("returns supported:true when WebGPU is available", async () => {
      const mockAdapter = { fake: "adapter" };
      const originalGpu = (navigator as any).gpu;
      (navigator as any).gpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };

      const freshEngine = new WebLLMEngine();
      const result = await freshEngine.checkSupport();
      expect(result.supported).toBe(true);

      // Restore
      if (originalGpu === undefined) {
        delete (navigator as any).gpu;
      } else {
        (navigator as any).gpu = originalGpu;
      }
    });

    it("returns supported:false when adapter request returns null", async () => {
      const originalGpu = (navigator as any).gpu;
      (navigator as any).gpu = {
        requestAdapter: vi.fn().mockResolvedValue(null),
      };

      const freshEngine = new WebLLMEngine();
      const result = await freshEngine.checkSupport();
      expect(result.supported).toBe(false);
      expect(result.reason).toContain("adapter");

      if (originalGpu === undefined) {
        delete (navigator as any).gpu;
      } else {
        (navigator as any).gpu = originalGpu;
      }
    });

    it("returns supported:false when adapter request throws", async () => {
      const originalGpu = (navigator as any).gpu;
      (navigator as any).gpu = {
        requestAdapter: vi.fn().mockRejectedValue(new Error("GPU error")),
      };

      const freshEngine = new WebLLMEngine();
      const result = await freshEngine.checkSupport();
      expect(result.supported).toBe(false);
      expect(result.reason).toContain("GPU error");

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
    it("has a valid modelId matching gemma-2-2b", () => {
      expect(WEBLLM_MODEL_REF.modelId).toBe("gemma-2-2b-it-q4f32_1-MLC");
    });

    it("has a valid modelUrl pointing to HuggingFace", () => {
      expect(WEBLLM_MODEL_REF.modelUrl).toContain("huggingface.co");
    });

    it("has a valid localId", () => {
      expect(WEBLLM_MODEL_REF.localId).toBeTruthy();
      expect(typeof WEBLLM_MODEL_REF.localId).toBe("string");
    });
  });
});
