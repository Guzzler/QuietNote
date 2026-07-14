import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Guards for the unsupported-browser fallback (R2a, 2026-07-13). The R2
// cold-start audit (2026-07-12) confirmed the fallback card full-screen
// blocks ALL writing while its copy promised "You can still use QuietNote
// for writing" — the screen must never promise what it blocks. It also
// proved the Transformers.js "WASM fallback" claim false: the ONNX q4f16
// model has no WASM/CPU kernel path (GatherBlockQuantized), so the engine
// must not report itself supported without WebGPU. Same
// read-source-as-text pattern as FeedbackChannelGuards.test.ts.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

describe("WebGPU fallback honesty guards (R2a)", () => {
  describe("fallback card copy matches its behavior", () => {
    const source = read("../WebGPUFallback.tsx");

    it("never promises writing while blocking it", () => {
      expect(source).not.toContain("still use QuietNote for writing");
      expect(source).not.toContain("still use QuietNote");
    });

    it("reassures that data never left the device", () => {
      expect(source).toContain("never left this device");
    });

    it("names the supported browsers as the way forward", () => {
      expect(source).toContain("Chrome");
      expect(source).toContain("Edge");
    });
  });

  describe("Transformers.js does not claim WASM support it lacks", () => {
    const source = read("../../inference/transformersjs-engine.ts");

    it("checkSupport can return unsupported (no always-true WASM claim)", () => {
      expect(source).toContain("supported: false");
    });

    it("engine source documents the missing WASM kernel path", () => {
      expect(source).toContain("GatherBlockQuantized");
    });
  });
});
