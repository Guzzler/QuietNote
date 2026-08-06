import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { MODEL_DOWNLOAD_SIZES } from "../types";
import type { RuntimeId } from "../types";

// Guards for the default inference engine (R7, 2026-08-05).
//
// Which model answers a first-time visitor is decided in TWO independent
// places, and nothing used to pin either one — that gap let the 2026-08-05
// swap be a two-line change with no failing test:
//
//   1. `createEngine(runtime: RuntimeId = ...)` in `../index.ts` — the
//      fallback when no runtime is passed.
//   2. `getStoredRuntime()` in `../../hooks/useInferenceEngine.ts` — the
//      fallback when `localStorage` has no `quietnote-runtime` key, i.e.
//      every genuinely first-time visitor.
//
// Pinning only one lets the two drift apart, which is the actual failure
// mode: the hook would boot one engine while `createEngine`'s own default
// named another. So assert both halves AND their agreement.
//
// `getStoredRuntime` is module-private and `createEngine`'s default lives in
// a signature, so both are read as source text — the same pattern as
// DownloadSizeHonesty / WebGPUFallbackGuards.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

/** The engine a first-time visitor gets. Change this only with a measured
 *  decision — it sets the first-run download every stranger pays. */
const DEFAULT_RUNTIME: RuntimeId = "mediapipe";

describe("Default inference engine (R7)", () => {
  it("createEngine's default parameter is the default runtime", () => {
    const source = read("../index.ts");
    const match = source.match(
      /createEngine\s*\(\s*runtime\s*:\s*RuntimeId\s*=\s*"([a-z]+)"/,
    );
    expect(match, "createEngine's default parameter was not found").not.toBeNull();
    expect(match![1]).toBe(DEFAULT_RUNTIME);
  });

  it("getStoredRuntime falls back to the default runtime when no key is stored", () => {
    const source = read("../../hooks/useInferenceEngine.ts");
    const fn = source.match(/function getStoredRuntime\(\)[\s\S]*?\n}/);
    expect(fn, "getStoredRuntime was not found").not.toBeNull();

    // The no-key fallback is the last `return "<id>";` in the function body —
    // the earlier return is the stored-value passthrough.
    const returns = [...fn![0].matchAll(/return\s+"([a-z]+)"\s*;/g)];
    expect(returns.length, "no literal fallback return found").toBeGreaterThan(0);
    expect(returns[returns.length - 1][1]).toBe(DEFAULT_RUNTIME);
  });

  it("both halves agree — the hook cannot boot an engine createEngine does not default to", () => {
    const fromCreateEngine = read("../index.ts").match(
      /createEngine\s*\(\s*runtime\s*:\s*RuntimeId\s*=\s*"([a-z]+)"/,
    )![1];
    const storedFn = read("../../hooks/useInferenceEngine.ts").match(
      /function getStoredRuntime\(\)[\s\S]*?\n}/,
    )![0];
    const fromHook = [...storedFn.matchAll(/return\s+"([a-z]+)"\s*;/g)].pop()![1];

    expect(fromHook).toBe(fromCreateEngine);
  });

  it("the default runtime is a real runtime with a disclosed download size", () => {
    expect(MODEL_DOWNLOAD_SIZES[DEFAULT_RUNTIME]).toMatch(/^~\d+(\.\d+)? GB$/);
  });

  it("the WASM fileset version matches the bundled @mediapipe/tasks-genai", () => {
    // The fileset is fetched from a CDN by explicit version; if it drifts from
    // package.json the bundled JS API and the WASM disagree at load time.
    const pkg = JSON.parse(read("../../../package.json")) as {
      dependencies: Record<string, string>;
    };
    const declared = pkg.dependencies["@mediapipe/tasks-genai"].replace(/^[\^~]/, "");
    const pinned = read("../mediapipe-engine.ts").match(
      /TASKS_GENAI_VERSION\s*=\s*"([\d.]+)"/,
    );
    expect(pinned, "TASKS_GENAI_VERSION was not found").not.toBeNull();
    expect(pinned![1]).toBe(declared);
  });
});
