import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { MODEL_DOWNLOAD_SIZES } from "../../inference/types";
import type { RuntimeId } from "../../inference/types";

// Guards for download-size honesty on the loading card (R2b, 2026-07-13).
// A cold start auto-downloads gigabytes; the card must disclose the size
// for the ACTIVE runtime before the user pays for it (worse on cellular).
// Sizes are the measured values from R1b/R1e — update them only with a new
// measurement. Same read-source-as-text pattern as WebGPUFallbackGuards.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

describe("Download-size honesty (R2b)", () => {
  it("declares a size for every runtime", () => {
    const runtimes: RuntimeId[] = ["webllm", "transformersjs", "mediapipe"];
    for (const id of runtimes) {
      expect(MODEL_DOWNLOAD_SIZES[id]).toMatch(/^~\d+(\.\d+)? GB$/);
    }
  });

  it("pins the measured sizes (R1b: webllm 1.49 GB, transformersjs 3.15 GB; R1e: mediapipe 2.00 GB)", () => {
    expect(MODEL_DOWNLOAD_SIZES.webllm).toBe("~1.5 GB");
    expect(MODEL_DOWNLOAD_SIZES.transformersjs).toBe("~3.2 GB");
    expect(MODEL_DOWNLOAD_SIZES.mediapipe).toBe("~2.0 GB");
  });

  describe("loading card discloses the active runtime's size", () => {
    const source = read("../../App.tsx");

    it("first-time note renders the per-runtime size", () => {
      expect(source).toContain("MODEL_DOWNLOAD_SIZES[runtimeId]");
      expect(source).toContain("downloads the AI model");
      expect(source).toContain("stored on this device");
    });

    it("the vague no-size copy is gone", () => {
      expect(source).not.toContain(
        "First time takes a few minutes. After that, it loads instantly.",
      );
    });
  });
});
