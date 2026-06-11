import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  INVITATION_TEXT,
  pickAuxiliaryElement,
  type WelcomeSuggestion,
} from "../../utils/welcomeEmptyState";
import type { ContinuityPrompt } from "../../utils/continuityPrompt";

const continuity: ContinuityPrompt = {
  kind: "last-session",
  headline: "Pick up where you left off",
  body: "Yesterday, you wrote about work. How are you feeling about that today?",
  suggestedInput: "I want to revisit what I wrote about work. ",
};

const suggestion: WelcomeSuggestion = {
  text: "Wind down with an evening reflection?",
  mode: "checkin",
};

describe("WelcomeEmptyState contract", () => {
  describe("pickAuxiliaryElement — at most ONE auxiliary element", () => {
    it("continuity prompt wins when both are available", () => {
      expect(pickAuxiliaryElement(continuity, suggestion)).toBe("continuity");
    });

    it("falls back to the suggestion link when there is no continuity prompt", () => {
      expect(pickAuxiliaryElement(null, suggestion)).toBe("suggestion");
    });

    it("renders nothing auxiliary when neither is available", () => {
      expect(pickAuxiliaryElement(null, null)).toBe("none");
    });
  });

  describe("invitation copy", () => {
    it("is an invitation to write", () => {
      expect(INVITATION_TEXT.toLowerCase()).toContain("writing");
    });

    it("does not mention privacy, moods, or streaks", () => {
      const lower = INVITATION_TEXT.toLowerCase();
      for (const banned of ["privacy", "private", "device", "mood", "streak", "safe"]) {
        expect(lower).not.toContain(banned);
      }
    });
  });

  describe("removed dashboard copy stays removed", () => {
    const read = (rel: string) =>
      readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");
    const welcomeSource = read("../WelcomeEmptyState.tsx");
    const chatPanelSource = read("../ChatPanel.tsx");

    const FORBIDDEN = [
      "stays on your device",
      "Your thoughts are safe here",
      "Track your mood to get personalized insights",
      "journaling streak",
      "A private space to reflect",
      "Track your mood over time to discover patterns",
    ];

    it.each(FORBIDDEN)("welcome surface never renders %j", (phrase) => {
      expect(welcomeSource).not.toContain(phrase);
      expect(chatPanelSource).not.toContain(phrase);
    });

    it("ChatPanel no longer renders correlations or streak pills in the welcome", () => {
      expect(chatPanelSource).not.toContain("MoodJournalCorrelations");
      expect(chatPanelSource).not.toContain("computeStreak");
    });
  });
});
