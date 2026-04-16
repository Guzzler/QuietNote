import { describe, it, expect } from "vitest";

// Test the smart title truncation logic used in App.tsx

function smartTitle(text: string): string {
  if (!text.trim()) return "Quietnote";

  const cleaned = text.trim();

  // Try to find first sentence (up to . ! ?)
  const sentenceMatch = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentenceMatch && sentenceMatch[1].length <= 80) {
    return sentenceMatch[1];
  }

  // No short sentence — take first ~10 words
  const words = cleaned.split(/\s+/).slice(0, 10);
  const result = words.join(" ");

  if (result.length > 80) {
    const truncated = result.slice(0, 80).replace(/\s+\S*$/, "");
    return truncated + "\u2026";
  }

  if (words.length < cleaned.split(/\s+/).length) {
    return result + "\u2026";
  }

  return result;
}

describe("Smart session title truncation", () => {
  it("returns 'Quietnote' for empty input", () => {
    expect(smartTitle("")).toBe("Quietnote");
    expect(smartTitle("   ")).toBe("Quietnote");
  });

  it("returns short messages as-is", () => {
    expect(smartTitle("Had a great day")).toBe("Had a great day");
  });

  it("extracts first sentence when short enough", () => {
    expect(smartTitle("I feel anxious. There is so much going on at work right now."))
      .toBe("I feel anxious.");
  });

  it("extracts first sentence with exclamation mark", () => {
    expect(smartTitle("What a day! I can barely process everything that happened."))
      .toBe("What a day!");
  });

  it("extracts first sentence with question mark", () => {
    expect(smartTitle("Why do I keep doing this? I know it doesn't help."))
      .toBe("Why do I keep doing this?");
  });

  it("takes first 10 words with ellipsis when no sentence boundary", () => {
    const longText = "I have been thinking about how I want to change my approach to work and relationships and everything in my life";
    const result = smartTitle(longText);
    // 10 words = "I have been thinking about how I want to change" + ellipsis
    // "my" is the 10th word but gets included, result may truncate at word boundary if >80 chars
    expect(result).toContain("I have been thinking about how I want to change");
    expect(result).toMatch(/\u2026$/);
  });

  it("does not add ellipsis when text is exactly 10 words or less", () => {
    expect(smartTitle("A short five word entry")).toBe("A short five word entry");
  });

  it("handles very long first sentences by falling back to word truncation", () => {
    const longSentence = "I really need to talk about the extremely complicated situation that has been developing over the past several weeks at my workplace because it is causing me tremendous stress and anxiety.";
    const result = smartTitle(longSentence);
    // Should be first 10 words + ellipsis, not the full sentence
    expect(result).toBe("I really need to talk about the extremely complicated situation\u2026");
    expect(result.length).toBeLessThanOrEqual(85); // 80 + ellipsis margin
  });

  it("does not cut in the middle of a word", () => {
    const text = "Superlongword anotherlongword yetanotherlongword morelongwords extralongword biglongword hugelongword vastwording enormousword gianticword";
    const result = smartTitle(text);
    // Should not end mid-word
    expect(result).not.toMatch(/[a-z]$/); // Should end with ellipsis
  });
});
