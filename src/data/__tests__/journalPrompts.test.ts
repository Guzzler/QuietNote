import { describe, it, expect } from "vitest";
import {
  JOURNAL_PROMPTS,
  getValidatedPrompts,
  getPromptsByCategory,
  getPromptById,
  getAllCategories,
} from "../journalPrompts";
import type { PromptCategory } from "../../types";

const VALID_CATEGORIES: PromptCategory[] = [
  "gratitude",
  "self-reflection",
  "goals",
  "challenges",
  "relationships",
  "growth",
  "creativity",
];

describe("journalPrompts data integrity", () => {
  it("has unique ids across the whole library", () => {
    const ids = JOURNAL_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every prompt has non-empty text and a known category", () => {
    for (const p of JOURNAL_PROMPTS) {
      expect(p.text.trim().length).toBeGreaterThan(0);
      expect(VALID_CATEGORIES).toContain(p.category);
    }
  });

  it("getPromptById round-trips for every prompt", () => {
    for (const p of JOURNAL_PROMPTS) {
      expect(getPromptById(p.id)).toEqual(p);
    }
  });

  it("getAllCategories returns only known categories", () => {
    for (const cat of getAllCategories()) {
      expect(VALID_CATEGORIES).toContain(cat);
    }
  });
});

describe("validated high-pull prompts (B3 seeding)", () => {
  const validated = getValidatedPrompts();

  it("seeds at least one validated prompt per high-pull theme", () => {
    expect(validated.length).toBeGreaterThanOrEqual(5);
    const all = validated.map((p) => p.text.toLowerCase()).join(" | ");
    // Anxiety was the #2 prompt driver (345 entries) in the launched app.
    expect(all).toMatch(/anxious|worr/);
    // Gratitude was #3 (296).
    expect(getValidatedPrompts().some((p) => p.category === "gratitude")).toBe(true);
    // "makes you smile" pulled well.
    expect(all).toContain("smile");
    // "List 10 of your favorite things".
    expect(all).toMatch(/favorite things/);
    // Low-friction "just start" entry (#1, 491).
    expect(all).toMatch(/start anywhere|on your mind/);
  });

  it("marks every seeded prompt with validated: true and nothing else", () => {
    for (const p of JOURNAL_PROMPTS) {
      const isSeeded = validated.some((v) => v.id === p.id);
      expect(p.validated === true).toBe(isSeeded);
    }
  });

  it("surfaces validated prompts through the normal category accessor", () => {
    // B3 requires no special plumbing — seeded prompts must appear via the
    // same path the PromptSelector uses.
    const anxiety = getPromptsByCategory("challenges").find(
      (p) => p.id === "challenges-9"
    );
    expect(anxiety?.validated).toBe(true);
  });
});
