import { describe, it, expect } from "vitest";
import {
  extractEmotions,
  estimateIntensity,
  getTopEmotion,
} from "../emotionExtractor";

describe("extractEmotions", () => {
  it("returns empty array for empty text", () => {
    expect(extractEmotions("")).toEqual([]);
    expect(extractEmotions("  ")).toEqual([]);
  });

  it("detects a single emotion", () => {
    const result = extractEmotions("I'm feeling really anxious today");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].emotion).toBe("anxious");
    expect(result[0].matchedKeywords).toContain("anxious");
  });

  it("detects sadness keywords", () => {
    const result = extractEmotions(
      "I've been crying all day and feel so sad"
    );
    const sadMatch = result.find((r) => r.emotion === "sad");
    expect(sadMatch).toBeDefined();
    expect(sadMatch!.matchedKeywords).toContain("sad");
    expect(sadMatch!.matchedKeywords).toContain("crying");
  });

  it("detects happiness keywords", () => {
    const result = extractEmotions(
      "Today was wonderful, I feel so happy and cheerful"
    );
    const happyMatch = result.find((r) => r.emotion === "happy");
    expect(happyMatch).toBeDefined();
    expect(happyMatch!.matchedKeywords).toContain("happy");
    expect(happyMatch!.matchedKeywords).toContain("wonderful");
    expect(happyMatch!.matchedKeywords).toContain("cheerful");
  });

  it("detects multiple emotions", () => {
    const result = extractEmotions(
      "I feel anxious about work but grateful for my friends"
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    const emotions = result.map((r) => r.emotion);
    expect(emotions).toContain("anxious");
    expect(emotions).toContain("grateful");
  });

  it("returns results sorted by confidence descending", () => {
    const result = extractEmotions(
      "I'm feeling really sad and heartbroken, been crying all night, tears won't stop"
    );
    // Sad should have high confidence due to many keyword matches
    expect(result[0].emotion).toBe("sad");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].confidence).toBeLessThanOrEqual(
        result[i - 1].confidence
      );
    }
  });

  it("returns empty for neutral text", () => {
    const result = extractEmotions("The weather is nice today");
    expect(result.length).toBe(0);
  });

  it("returns empty for very short neutral text", () => {
    const result = extractEmotions("ok");
    expect(result.length).toBe(0);
  });

  it("detects loneliness", () => {
    const result = extractEmotions(
      "I feel so alone and isolated, like nobody cares"
    );
    const lonelyMatch = result.find((r) => r.emotion === "lonely");
    expect(lonelyMatch).toBeDefined();
    expect(lonelyMatch!.matchedKeywords).toContain("alone");
    expect(lonelyMatch!.matchedKeywords).toContain("isolated");
  });

  it("detects frustration", () => {
    const result = extractEmotions("I'm so frustrated, feeling completely stuck");
    const frustratedMatch = result.find((r) => r.emotion === "frustrated");
    expect(frustratedMatch).toBeDefined();
  });

  it("detects calm/peaceful emotions", () => {
    const result = extractEmotions(
      "I feel calm and at peace after meditation"
    );
    const calmMatch = result.find((r) => r.emotion === "calm");
    expect(calmMatch).toBeDefined();
  });

  it("handles case insensitivity", () => {
    const result = extractEmotions("I'm REALLY ANXIOUS about tomorrow");
    const anxiousMatch = result.find((r) => r.emotion === "anxious");
    expect(anxiousMatch).toBeDefined();
  });
});

describe("estimateIntensity", () => {
  it("returns base intensity of 5 with no modifiers", () => {
    expect(estimateIntensity("I feel anxious", "anxious")).toBe(5);
  });

  it("increases intensity with amplifiers", () => {
    expect(estimateIntensity("I feel extremely anxious", "anxious")).toBe(8);
    expect(estimateIntensity("I feel really anxious", "anxious")).toBe(7);
    expect(estimateIntensity("I feel very anxious", "anxious")).toBe(7);
  });

  it("decreases intensity with dampeners", () => {
    expect(estimateIntensity("I feel a little anxious", "anxious")).toBe(3);
    expect(estimateIntensity("I feel slightly anxious", "anxious")).toBe(3);
    expect(estimateIntensity("I feel somewhat anxious", "anxious")).toBe(4);
  });

  it("clamps intensity to 1-10 range", () => {
    // Even with extreme modifiers, should stay in range
    const high = estimateIntensity(
      "I feel extremely incredibly really anxious",
      "anxious"
    );
    expect(high).toBeLessThanOrEqual(10);
    expect(high).toBeGreaterThanOrEqual(1);
  });

  it("returns 5 when no keyword matches", () => {
    expect(estimateIntensity("The weather is nice", "anxious")).toBe(5);
  });
});

describe("getTopEmotion", () => {
  it("returns null for empty text", () => {
    expect(getTopEmotion("")).toBeNull();
  });

  it("returns null for neutral text", () => {
    expect(getTopEmotion("The weather is nice")).toBeNull();
  });

  it("returns the highest confidence emotion", () => {
    const result = getTopEmotion("I feel really anxious and worried");
    expect(result).not.toBeNull();
    expect(result!.emotion).toBe("anxious");
  });

  it("respects minimum confidence threshold", () => {
    // Single keyword match with default threshold
    const result = getTopEmotion("I feel sad", 0.4);
    expect(result).not.toBeNull();

    // Very high threshold should filter out low-confidence matches
    const filtered = getTopEmotion("I feel sad", 0.99);
    expect(filtered).toBeNull();
  });

  it("returns emotion with intensity estimate", () => {
    const result = getTopEmotion("I feel extremely happy today");
    expect(result).not.toBeNull();
    expect(result!.emotion).toBe("happy");
    expect(result!.intensity).toBeGreaterThan(5);
  });
});
