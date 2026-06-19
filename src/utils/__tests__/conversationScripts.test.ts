/**
 * Data-integrity tests for the hand-authored conversation scripts
 * (Track C1, 2026-06-18). These guard the *fairness* and well-formedness of
 * the scripts so the driver measures real degradation, not authoring bugs.
 */

import { describe, it, expect } from "vitest";
import { CONVERSATION_SCRIPTS } from "../conversationScripts";

const VALID_MODES = new Set(["freewrite", "gratitude", "checkin", "thoughtrecord"]);

describe("CONVERSATION_SCRIPTS — structure", () => {
  it("has at least the three planned scripts", () => {
    const ids = CONVERSATION_SCRIPTS.map((s) => s.id);
    expect(ids).toContain("script-freewrite-retention");
    expect(ids).toContain("script-thoughtrecord-steps");
    expect(ids).toContain("script-checkin-retention");
  });

  it("every script has a unique id", () => {
    const ids = CONVERSATION_SCRIPTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every script has a valid mode and a non-empty description", () => {
    for (const s of CONVERSATION_SCRIPTS) {
      expect(VALID_MODES.has(s.mode)).toBe(true);
      expect(s.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("every script has at least one scored or probe turn", () => {
    for (const s of CONVERSATION_SCRIPTS) {
      const interactive = s.turns.filter((t) => t.expect || t.retentionProbe);
      expect(interactive.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("CONVERSATION_SCRIPTS — retention probes are fair", () => {
  it("every probe has a non-empty mustContainAny", () => {
    for (const s of CONVERSATION_SCRIPTS) {
      for (const t of s.turns) {
        if (t.retentionProbe) {
          expect(t.retentionProbe.mustContainAny.length).toBeGreaterThan(0);
          expect(t.retentionProbe.entity.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every probe entity term appears in an EARLIER user turn (so recall is fair)", () => {
    for (const s of CONVERSATION_SCRIPTS) {
      const earlierUserText: string[] = [];
      for (const t of s.turns) {
        if (t.retentionProbe) {
          const haystack = earlierUserText.join(" ").toLowerCase();
          const grounded = t.retentionProbe.mustContainAny.some((term) =>
            haystack.includes(term.toLowerCase())
          );
          expect(
            grounded,
            `Probe in "${s.id}" expects [${t.retentionProbe.mustContainAny.join(
              ", "
            )}] but none of those appear in any earlier user turn`
          ).toBe(true);
        }
        earlierUserText.push(t.user);
      }
    }
  });
});

describe("CONVERSATION_SCRIPTS — guided scripts step coherence", () => {
  it("guided scripts (expectedSteps set) have contiguous 1..N stepIndex turns", () => {
    for (const s of CONVERSATION_SCRIPTS) {
      if (s.expectedSteps === undefined) continue;
      const steps = s.turns
        .filter((t) => t.stepIndex !== undefined)
        .map((t) => t.stepIndex as number);
      // One turn per declared step, in order, contiguous 1..N.
      expect(steps.length).toBe(s.expectedSteps);
      expect(steps).toEqual(
        Array.from({ length: s.expectedSteps }, (_, i) => i + 1)
      );
      // Every step turn must carry an `expect` so coherence can be scored.
      for (const t of s.turns) {
        if (t.stepIndex !== undefined) expect(t.expect).toBeDefined();
      }
    }
  });

  it("non-guided scripts do not use stepIndex", () => {
    for (const s of CONVERSATION_SCRIPTS) {
      if (s.expectedSteps !== undefined) continue;
      const hasStep = s.turns.some((t) => t.stepIndex !== undefined);
      expect(hasStep).toBe(false);
    }
  });
});
