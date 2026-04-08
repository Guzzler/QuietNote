import { describe, it, expect } from "vitest";
import { THOUGHT_RECORD_SEQUENCE } from "../../data/journalPrompts";

/**
 * Tests for ThoughtRecordGuide logic — verifying 5-step CBT thought record
 * step/prompt mapping and completion behavior.
 */

function getThoughtRecordState(currentStep: number) {
  const step = THOUGHT_RECORD_SEQUENCE[Math.min(currentStep - 1, THOUGHT_RECORD_SEQUENCE.length - 1)];
  const total = THOUGHT_RECORD_SEQUENCE.length;
  const displayStep = Math.min(currentStep, total);
  const isComplete = currentStep > total;

  return { step, total, displayStep, isComplete };
}

describe("ThoughtRecordGuide logic", () => {
  it("step 1 shows situation prompt", () => {
    const state = getThoughtRecordState(1);
    expect(state.displayStep).toBe(1);
    expect(state.step.prompt).toBe("What happened? Describe the situation briefly.");
    expect(state.isComplete).toBe(false);
  });

  it("step 2 shows automatic thought prompt", () => {
    const state = getThoughtRecordState(2);
    expect(state.displayStep).toBe(2);
    expect(state.step.prompt).toBe("What went through your mind? What were you thinking?");
  });

  it("step 3 shows emotion prompt", () => {
    const state = getThoughtRecordState(3);
    expect(state.displayStep).toBe(3);
    expect(state.step.prompt).toBe("What emotions did you feel? How intense were they (1-10)?");
  });

  it("step 4 shows evidence prompt", () => {
    const state = getThoughtRecordState(4);
    expect(state.displayStep).toBe(4);
    expect(state.step.prompt).toBe("What evidence supports or contradicts this thought?");
  });

  it("step 5 shows balanced thought prompt", () => {
    const state = getThoughtRecordState(5);
    expect(state.displayStep).toBe(5);
    expect(state.step.prompt).toBe("What's a more balanced way to think about this?");
  });

  it("marks complete when step > 5", () => {
    const state = getThoughtRecordState(6);
    expect(state.isComplete).toBe(true);
  });

  it("clamps displayStep to total when past completion", () => {
    const state = getThoughtRecordState(7);
    expect(state.displayStep).toBe(5);
    expect(state.isComplete).toBe(true);
  });

  describe("sequence data", () => {
    it("has exactly 5 steps", () => {
      expect(THOUGHT_RECORD_SEQUENCE).toHaveLength(5);
    });

    it("steps are numbered 1 through 5", () => {
      expect(THOUGHT_RECORD_SEQUENCE.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
    });

    it("all prompts are non-empty strings", () => {
      THOUGHT_RECORD_SEQUENCE.forEach((s) => {
        expect(typeof s.prompt).toBe("string");
        expect(s.prompt.length).toBeGreaterThan(0);
      });
    });
  });
});
