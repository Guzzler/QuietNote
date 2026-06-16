import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Source-level guards for the Track A2 visual calm pass (2026-06-11).
// Same pattern as WelcomeEmptyState.test.ts: read component source as text
// and assert the calmed-down chrome stays calmed down.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

const WRITING_PATH_COMPONENTS = [
  "../ChatPanel.tsx",
  "../WelcomeEmptyState.tsx",
  "../InlineMoodCheck.tsx",
  "../ThoughtRecordGuide.tsx",
  "../GratitudeGuide.tsx",
  "../PromptSuggestionCard.tsx",
  "../JournalingModeSelector.tsx",
] as const;

describe("Visual calm guards (Track A2)", () => {
  describe("one accent on the writing path", () => {
    it.each(WRITING_PATH_COMPONENTS)(
      "%s contains no purple- or emerald- classes",
      (rel) => {
        const source = read(rel);
        expect(source).not.toContain("purple-");
        expect(source).not.toContain("emerald-");
      }
    );
  });

  describe("entries do not glow", () => {
    it("ChatPanel has no hover shadow anywhere", () => {
      expect(read("../ChatPanel.tsx")).not.toContain("hover:shadow");
    });
  });

  describe("serif writing surface", () => {
    it("index.css registers --font-serif in the Tailwind theme", () => {
      expect(read("../../index.css")).toContain("--font-serif");
    });

    it("ChatPanel applies font-serif (message content + textarea)", () => {
      expect(read("../ChatPanel.tsx")).toContain("font-serif");
    });

    it("WelcomeEmptyState applies font-serif (greeting + invitation)", () => {
      expect(read("../WelcomeEmptyState.tsx")).toContain("font-serif");
    });
  });

  describe("mojibake regression guard", () => {
    it("App.tsx contains no UTF-8-as-Latin-1 artifacts", () => {
      expect(read("../../App.tsx")).not.toContain("â€");
    });
  });

  describe("disclaimer copy untouched by the restyle", () => {
    it("ChatPanel still renders the AI limitations disclaimer verbatim", () => {
      const source = read("../ChatPanel.tsx");
      expect(source).toContain("not a therapist or mental health professional");
      expect(source).toContain("Crisis resources");
    });
  });
});
