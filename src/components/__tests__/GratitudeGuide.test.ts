import { describe, it, expect } from "vitest";
import { GRATITUDE_SEQUENCE } from "../../data/journalPrompts";

/**
 * Tests for GratitudeGuide logic — verifying step/prompt mapping
 * and completion behavior.
 */

function getGratitudeState(currentStep: number) {
  const step = GRATITUDE_SEQUENCE[Math.min(currentStep - 1, GRATITUDE_SEQUENCE.length - 1)];
  const total = GRATITUDE_SEQUENCE.length;
  const displayStep = Math.min(currentStep, total);
  const isComplete = currentStep > total;

  return { step, total, displayStep, isComplete };
}

describe("GratitudeGuide logic", () => {
  it("step 1 shows 'What are you grateful for today?'", () => {
    const state = getGratitudeState(1);
    expect(state.displayStep).toBe(1);
    expect(state.step.prompt).toBe("What are you grateful for today?");
    expect(state.isComplete).toBe(false);
  });

  it("step 2 shows 'Why does this matter to you?'", () => {
    const state = getGratitudeState(2);
    expect(state.displayStep).toBe(2);
    expect(state.step.prompt).toBe("Why does this matter to you?");
  });

  it("step 3 shows 'How did it make you feel?'", () => {
    const state = getGratitudeState(3);
    expect(state.displayStep).toBe(3);
    expect(state.step.prompt).toBe("How did it make you feel?");
  });

  it("marks complete when step > 3", () => {
    const state = getGratitudeState(4);
    expect(state.isComplete).toBe(true);
  });

  it("clamps displayStep to total when past completion", () => {
    const state = getGratitudeState(5);
    expect(state.displayStep).toBe(3);
    expect(state.isComplete).toBe(true);
  });

  describe("sequence data", () => {
    it("has exactly 3 steps", () => {
      expect(GRATITUDE_SEQUENCE).toHaveLength(3);
    });

    it("steps are numbered 1, 2, 3", () => {
      expect(GRATITUDE_SEQUENCE.map((s) => s.step)).toEqual([1, 2, 3]);
    });

    it("all prompts are non-empty strings", () => {
      GRATITUDE_SEQUENCE.forEach((s) => {
        expect(typeof s.prompt).toBe("string");
        expect(s.prompt.length).toBeGreaterThan(0);
      });
    });
  });
});
