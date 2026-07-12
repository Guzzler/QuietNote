import { describe, it, expect, vi, beforeEach } from "vitest";

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
import { MediaPipeEngine, MEDIAPIPE_MODEL_REF } from "../mediapipe-engine";
import { MODEL_CONTEXT_LIMIT } from "../../utils/tokenEstimator";
import pkg from "../../../package.json";

describe("MediaPipeEngine", () => {
  let engine: MediaPipeEngine;

  beforeEach(() => {
    engine = new MediaPipeEngine();
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
