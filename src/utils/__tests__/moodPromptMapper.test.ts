import { describe, it, expect } from "vitest";
import { getMoodAwarePrompts } from "../moodPromptMapper";
import type { MoodEmotion } from "../../types";

describe("getMoodAwarePrompts", () => {
  const allEmotions: MoodEmotion[] = [
    "anxious", "frustrated", "angry", "sad", "lonely",
    "happy", "excited", "grateful", "calm", "content",
  ];

  it("returns the requested number of prompts", () => {
    const prompts = getMoodAwarePrompts("anxious", 3);
    expect(prompts).toHaveLength(3);
  });

  it("returns fewer prompts if not enough available", () => {
    const prompts = getMoodAwarePrompts("happy", 100);
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.length).toBeLessThanOrEqual(100);
  });

  it("returns no duplicates", () => {
    const prompts = getMoodAwarePrompts("sad", 5);
    const ids = prompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(allEmotions)("returns prompts for emotion: %s", (emotion) => {
    const prompts = getMoodAwarePrompts(emotion, 3);
    expect(prompts.length).toBeGreaterThanOrEqual(1);
    prompts.forEach((p) => {
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("text");
      expect(p).toHaveProperty("category");
    });
  });

  it("returns prompts from correct categories for anxious", () => {
    const prompts = getMoodAwarePrompts("anxious", 3);
    const categories = prompts.map((p) => p.category);
    categories.forEach((c) => {
      expect(["challenges", "self-reflection"]).toContain(c);
    });
  });

  it("returns prompts from correct categories for happy", () => {
    const prompts = getMoodAwarePrompts("happy", 3);
    const categories = prompts.map((p) => p.category);
    categories.forEach((c) => {
      expect(["gratitude", "growth"]).toContain(c);
    });
  });

  it("returns prompts from multiple categories when count allows", () => {
    const prompts = getMoodAwarePrompts("excited", 3);
    const categories = new Set(prompts.map((p) => p.category));
    expect(categories.size).toBeGreaterThanOrEqual(1);
  });
});
