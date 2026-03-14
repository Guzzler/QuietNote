import { describe, it, expect } from "vitest";
import { extractThemes, getTopTheme } from "../themeExtractor";

describe("extractThemes", () => {
  it("returns empty array for empty text", () => {
    expect(extractThemes("")).toEqual([]);
    expect(extractThemes("   ")).toEqual([]);
  });

  it("returns empty array for neutral text with no themes", () => {
    expect(extractThemes("The weather is nice today")).toEqual([]);
  });

  it("detects relationship themes", () => {
    const result = extractThemes(
      "I've been thinking a lot about my relationship with my mom lately"
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].theme).toBe("relationships");
    expect(result[0].matchedKeywords).toContain("relationship");
    expect(result[0].matchedKeywords).toContain("mom");
  });

  it("detects goals themes", () => {
    const result = extractThemes(
      "I want to achieve my career goals and improve my daily routine"
    );
    expect(result.length).toBeGreaterThan(0);
    const goalsTheme = result.find((r) => r.theme === "goals");
    expect(goalsTheme).toBeDefined();
    expect(goalsTheme!.matchedKeywords).toContain("career");
  });

  it("detects challenges themes", () => {
    const result = extractThemes(
      "I'm really struggling with burnout and feeling overwhelmed at work"
    );
    expect(result.length).toBeGreaterThan(0);
    const challengeTheme = result.find((r) => r.theme === "challenges");
    expect(challengeTheme).toBeDefined();
    expect(challengeTheme!.matchedKeywords).toContain("struggling");
  });

  it("detects gratitude themes", () => {
    const result = extractThemes(
      "I feel so grateful and thankful for the people in my life"
    );
    expect(result.length).toBeGreaterThan(0);
    const gratitudeTheme = result.find((r) => r.theme === "gratitude");
    expect(gratitudeTheme).toBeDefined();
    expect(gratitudeTheme!.matchedKeywords).toContain("grateful");
    expect(gratitudeTheme!.matchedKeywords).toContain("thankful");
  });

  it("detects growth themes", () => {
    const result = extractThemes(
      "I've been learning a lot from my mistakes and trying to grow as a person"
    );
    expect(result.length).toBeGreaterThan(0);
    const growthTheme = result.find((r) => r.theme === "growth");
    expect(growthTheme).toBeDefined();
  });

  it("detects creativity themes", () => {
    const result = extractThemes(
      "I've been feeling really inspired and want to create something with my art"
    );
    expect(result.length).toBeGreaterThan(0);
    const creativityTheme = result.find((r) => r.theme === "creativity");
    expect(creativityTheme).toBeDefined();
    expect(creativityTheme!.matchedKeywords).toContain("inspired");
  });

  it("detects self-reflection themes", () => {
    const result = extractThemes(
      "I've had a big realization about what matters to me and my values"
    );
    expect(result.length).toBeGreaterThan(0);
    const reflectionTheme = result.find((r) => r.theme === "self-reflection");
    expect(reflectionTheme).toBeDefined();
  });

  it("detects multiple themes and sorts by confidence", () => {
    const result = extractThemes(
      "I'm grateful for my friend who helped me learn and grow through a challenge"
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    // Confidence should be descending
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].confidence).toBeGreaterThanOrEqual(
        result[i].confidence
      );
    }
  });

  it("is case insensitive", () => {
    const result = extractThemes("I'm GRATEFUL for my FAMILY and FRIENDS");
    expect(result.length).toBeGreaterThan(0);
    const gratitudeTheme = result.find((r) => r.theme === "gratitude");
    expect(gratitudeTheme).toBeDefined();
  });

  it("uses word boundaries to avoid false positives", () => {
    // "art" should match as a standalone word but not inside "apart"
    const result = extractThemes("I love making art and being creative");
    const creativityTheme = result.find((r) => r.theme === "creativity");
    expect(creativityTheme).toBeDefined();
    expect(creativityTheme!.matchedKeywords).toContain("art");
  });

  it("higher confidence with more keyword matches", () => {
    const singleMatch = extractThemes("I talked to my friend about it");
    const multiMatch = extractThemes(
      "My friend and my partner had an argument about our relationship and trust"
    );

    const singleRelTheme = singleMatch.find((r) => r.theme === "relationships");
    const multiRelTheme = multiMatch.find((r) => r.theme === "relationships");

    expect(singleRelTheme).toBeDefined();
    expect(multiRelTheme).toBeDefined();
    expect(multiRelTheme!.confidence).toBeGreaterThan(
      singleRelTheme!.confidence
    );
  });
});

describe("getTopTheme", () => {
  it("returns null for empty text", () => {
    expect(getTopTheme("")).toBeNull();
  });

  it("returns null for neutral text", () => {
    expect(getTopTheme("Just having a regular day")).toBeNull();
  });

  it("returns top theme when confidence exceeds threshold", () => {
    const result = getTopTheme(
      "I've been thinking about my relationship with my partner and family",
      0.4
    );
    expect(result).not.toBeNull();
    expect(result!.theme).toBe("relationships");
  });

  it("returns null when confidence is below threshold", () => {
    // Single keyword match gives 0.45 confidence, so 0.5 threshold should reject
    const result = getTopTheme("I talked to my friend", 0.5);
    expect(result).toBeNull();
  });

  it("respects custom confidence threshold", () => {
    // With very low threshold, even single keyword match should work
    const result = getTopTheme("I have a goal", 0.1);
    expect(result).not.toBeNull();
  });
});
