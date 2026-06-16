import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Source-level guards for the Track A4 inline mood check (2026-06-15).
// Same read-source-as-text pattern as VisualCalmGuards / WelcomeEmptyState.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

describe("InlineMoodCheck (Track A4)", () => {
  const source = read("../InlineMoodCheck.tsx");

  it("asks the gentle question", () => {
    expect(source).toContain("How are you feeling");
  });

  it("uses the calm palette only (no per-emotion colors)", () => {
    expect(source).not.toContain("purple-");
    expect(source).not.toContain("emerald-");
    expect(source).not.toContain("hover:shadow");
  });

  it("announces the confirmation to assistive tech", () => {
    const hasLiveRegion =
      source.includes("aria-live") || source.includes('role="status"');
    expect(hasLiveRegion).toBe(true);
  });

  it("is rendered at the free-write entry start (WelcomeEmptyState)", () => {
    const welcome = read("../WelcomeEmptyState.tsx");
    expect(welcome).toContain("InlineMoodCheck");
  });
});
