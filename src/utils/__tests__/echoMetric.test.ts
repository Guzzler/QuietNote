import { describe, it, expect } from "vitest";

import {
  firstSentence,
  maxNgramOverlap,
  scoreNoEcho,
  scoreTemplateSmell,
  templateSmellCount,
  ECHO_PASS_THRESHOLD,
  MIN_ECHO_NGRAM,
} from "../echoMetric";

describe("echoMetric (M1)", () => {
  describe("firstSentence", () => {
    it("takes the first sentence up to terminal punctuation", () => {
      expect(firstSentence("Hello there. Second sentence.")).toBe("Hello there.");
    });

    it("falls back to the whole text when unpunctuated", () => {
      expect(firstSentence("no punctuation here")).toBe("no punctuation here");
    });

    it("stops at a newline", () => {
      expect(firstSentence("line one\nline two.")).toBe("line one");
    });
  });

  describe("maxNgramOverlap", () => {
    const entry =
      "I finally fixed a bug that had been bothering me all week and I feel lighter than I have in days.";

    it("scores a full pronoun-swapped mirror near 1 (the 2026-07-11 failure)", () => {
      const mirrored =
        "You finally fixed a bug that had been bothering you all week and you feel lighter than you have in days.";
      expect(maxNgramOverlap(entry, mirrored)).toBeGreaterThan(0.9);
    });

    it("scores an own-words reply near 0", () => {
      const fresh =
        "A whole week of carrying that, and now it's done — where does the extra energy want to go?";
      expect(maxNgramOverlap(entry, fresh)).toBeLessThan(ECHO_PASS_THRESHOLD);
    });

    it("ignores incidental overlaps shorter than the minimum n-gram", () => {
      const incidental = "That bug is gone now for good.";
      expect(maxNgramOverlap(entry, incidental)).toBe(0);
      expect(MIN_ECHO_NGRAM).toBeGreaterThanOrEqual(3);
    });

    it("only measures the reply's FIRST sentence", () => {
      const lateEcho =
        "What a relief. I finally fixed a bug that had been bothering me all week and I feel lighter.";
      expect(maxNgramOverlap(entry, lateEcho)).toBe(0);
    });

    it("handles empty inputs", () => {
      expect(maxNgramOverlap("", "reply")).toBe(0);
      expect(maxNgramOverlap("entry", "")).toBe(0);
    });
  });

  describe("scoreNoEcho", () => {
    it("2 for an own-words opening", () => {
      expect(
        scoreNoEcho("My sister visited today.", "How did the visit land for you?")
      ).toBe(2);
    });

    it("0 for a mirrored opening", () => {
      expect(
        scoreNoEcho(
          "My landlord raised the rent two hundred dollars in March.",
          "Your landlord raised the rent two hundred dollars in March, and that is stressful."
        )
      ).toBe(0);
    });
  });

  describe("template smell", () => {
    it("counts stock phrases anywhere in the reply", () => {
      expect(
        templateSmellCount("Thank you for sharing. Remember to be kind to yourself.")
      ).toBe(2);
    });

    it("scores 2 / 1 / 0 for zero / one / many phrases", () => {
      expect(scoreTemplateSmell("Where does that leave you tonight?")).toBe(2);
      expect(scoreTemplateSmell("It takes courage to write that down.")).toBe(1);
      expect(
        scoreTemplateSmell("I hear that. It's okay to feel this. You are not alone in this.")
      ).toBe(0);
    });
  });
});
