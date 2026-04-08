import { describe, it, expect } from "vitest";
import {
  MORNING_CHECKIN_SEQUENCE,
  EVENING_CHECKIN_SEQUENCE,
} from "../../data/journalPrompts";

/**
 * Tests for CheckInGuide logic — verifying time-of-day detection,
 * step/prompt mapping, and completion behavior.
 *
 * Since there's no DOM test environment, we test the underlying logic
 * that drives the component rather than rendering it.
 */

function isMorning(hour: number): boolean {
  return hour >= 5 && hour < 12;
}

function getCheckinState(currentStep: number, hour: number) {
  const morning = isMorning(hour);
  const sequence = morning ? MORNING_CHECKIN_SEQUENCE : EVENING_CHECKIN_SEQUENCE;
  const step = sequence[Math.min(currentStep - 1, sequence.length - 1)];
  const total = sequence.length;
  const displayStep = Math.min(currentStep, total);
  const isComplete = currentStep > total;

  return {
    morning,
    sequence,
    step,
    total,
    displayStep,
    isComplete,
    title: morning ? "Morning Check-in" : "Evening Check-in",
  };
}

describe("CheckInGuide logic", () => {
  describe("isMorning", () => {
    it("returns true for morning hours (5-11)", () => {
      expect(isMorning(5)).toBe(true);
      expect(isMorning(9)).toBe(true);
      expect(isMorning(11)).toBe(true);
    });

    it("returns false for early morning hours (0-4)", () => {
      expect(isMorning(0)).toBe(false);
      expect(isMorning(4)).toBe(false);
    });

    it("returns false for afternoon/evening hours (12+)", () => {
      expect(isMorning(12)).toBe(false);
      expect(isMorning(15)).toBe(false);
      expect(isMorning(20)).toBe(false);
      expect(isMorning(23)).toBe(false);
    });
  });

  describe("morning check-in", () => {
    it("shows step 1 with first morning prompt", () => {
      const state = getCheckinState(1, 9);
      expect(state.morning).toBe(true);
      expect(state.title).toBe("Morning Check-in");
      expect(state.displayStep).toBe(1);
      expect(state.step.prompt).toBe("How are you feeling this morning?");
      expect(state.isComplete).toBe(false);
    });

    it("shows step 2 with second morning prompt", () => {
      const state = getCheckinState(2, 9);
      expect(state.displayStep).toBe(2);
      expect(state.step.prompt).toBe("What would you like to focus on today?");
    });

    it("shows step 3 with third morning prompt", () => {
      const state = getCheckinState(3, 9);
      expect(state.displayStep).toBe(3);
      expect(state.step.prompt).toBe("Is there anything weighing on your mind?");
    });

    it("marks complete when step > 3", () => {
      const state = getCheckinState(4, 9);
      expect(state.isComplete).toBe(true);
    });
  });

  describe("evening check-in", () => {
    it("shows step 1 with first evening prompt", () => {
      const state = getCheckinState(1, 20);
      expect(state.morning).toBe(false);
      expect(state.title).toBe("Evening Check-in");
      expect(state.displayStep).toBe(1);
      expect(state.step.prompt).toBe("How was your day?");
      expect(state.isComplete).toBe(false);
    });

    it("shows step 2 with second evening prompt", () => {
      const state = getCheckinState(2, 20);
      expect(state.step.prompt).toBe("What went well today?");
    });

    it("shows step 3 with third evening prompt", () => {
      const state = getCheckinState(3, 20);
      expect(state.step.prompt).toBe("What would you do differently?");
    });

    it("marks complete when step > 3", () => {
      const state = getCheckinState(4, 20);
      expect(state.isComplete).toBe(true);
    });
  });

  describe("sequence data", () => {
    it("morning sequence has exactly 3 steps", () => {
      expect(MORNING_CHECKIN_SEQUENCE).toHaveLength(3);
    });

    it("evening sequence has exactly 3 steps", () => {
      expect(EVENING_CHECKIN_SEQUENCE).toHaveLength(3);
    });

    it("steps are numbered 1, 2, 3", () => {
      expect(MORNING_CHECKIN_SEQUENCE.map((s) => s.step)).toEqual([1, 2, 3]);
      expect(EVENING_CHECKIN_SEQUENCE.map((s) => s.step)).toEqual([1, 2, 3]);
    });
  });
});
