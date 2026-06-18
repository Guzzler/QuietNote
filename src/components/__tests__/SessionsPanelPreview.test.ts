import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Source-level guards for the Track A5 Sessions sidebar previews (2026-06-17).
// Same read-source-as-text pattern as InlineMoodCheckGuards / VisualCalmGuards.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

describe("SessionsPanel previews (Track A5)", () => {
  const source = read("../SessionsPanel.tsx");

  it("uses the relative-time formatter for the visible date", () => {
    expect(source).toContain("formatRelative(");
  });

  it("no longer renders the raw machine timestamp as the visible date", () => {
    // toLocaleString may still appear once, inside the title= full-timestamp
    // fallback — but not as the rendered date text.
    const occurrences = source.split("toLocaleString()").length - 1;
    expect(occurrences).toBeLessThanOrEqual(1);
  });

  it("falls back to the first user message when no reflection exists", () => {
    expect(source).toContain("firstUserMessage");
    expect(source).toContain("s.reflection?.trim() || firstUserMessage(s)");
  });

  it("renders an accessible mood dot from shared emotion meta", () => {
    expect(source).toContain("emotionMeta");
    expect(source).toContain("EMOTION_DOT[mood]");
    expect(source).toContain("aria-label={`Mood:");
  });

  it("only renders the dot when a mood is present (never invents one)", () => {
    expect(source).toContain("{mood && (");
  });

  it("accepts moods as a prop", () => {
    expect(source).toContain("moods?: MoodEntry[]");
  });
});
