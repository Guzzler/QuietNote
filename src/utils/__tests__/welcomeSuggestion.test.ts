import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildGreeting, buildWelcomeSuggestion } from "../welcomeSuggestion";
import { pickAuxiliaryElement } from "../welcomeEmptyState";

// F6 — the first tester's stated primary use is CBT distortion work, and they
// never found Thought Record (field note
// docs/field-notes/2026-08-11-first-tester.md §B1). Two independent causes:
// the mode strip hid the 4th label at phone widths, and the only in-app
// surface that names the mode was unreachable without mood history.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

describe("F6 (b) — Thought Record is reachable with zero data", () => {
  it("surfaces the thought record at 00:35, the hour T1 wrote at", () => {
    const suggestion = buildWelcomeSuggestion(0, []);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.mode).toBe("thoughtrecord");
    expect(suggestion!.text.toLowerCase()).toContain("thought record");
  });

  it("no hour leaves a first-time user with no suggestion at all", () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(buildWelcomeSuggestion(hour, [])).not.toBeNull();
    }
  });

  it("some hour offers the thought record to a user with no mood history", () => {
    const hours = Array.from({ length: 24 }, (_, h) => buildWelcomeSuggestion(h, []));
    expect(hours.some((s) => s!.mode === "thoughtrecord")).toBe(true);
  });

  it("keeps the morning and evening check-in nudges exactly as they were", () => {
    for (const hour of [5, 9, 11]) {
      expect(buildWelcomeSuggestion(hour, [])).toEqual({
        text: "Start with a morning check-in?",
        mode: "checkin",
      });
    }
    for (const hour of [17, 19, 20]) {
      expect(buildWelcomeSuggestion(hour, [])).toEqual({
        text: "Wind down with an evening reflection?",
        mode: "checkin",
      });
    }
  });

  it("keeps the greeting bands unchanged", () => {
    expect(buildGreeting(4)).toBe("Hello");
    expect(buildGreeting(5)).toBe("Good morning");
    expect(buildGreeting(11)).toBe("Good morning");
    expect(buildGreeting(12)).toBe("Good afternoon");
    expect(buildGreeting(16)).toBe("Good afternoon");
    expect(buildGreeting(17)).toBe("Good evening");
    expect(buildGreeting(20)).toBe("Good evening");
    expect(buildGreeting(21)).toBe("Hello");
  });

  it("the mood-based override still wins", () => {
    const anxious = [
      { id: "1", emotion: "anxious" as const, intensity: 8, contexts: [], ts: 5 },
      { id: "2", emotion: "frustrated" as const, intensity: 7, contexts: [], ts: 4 },
      { id: "3", emotion: "happy" as const, intensity: 5, contexts: [], ts: 3 },
      { id: "4", emotion: "calm" as const, intensity: 5, contexts: [], ts: 2 },
      { id: "5", emotion: "happy" as const, intensity: 5, contexts: [], ts: 1 },
    ];
    expect(buildWelcomeSuggestion(9, anxious)).toEqual({
      text: "Feeling overwhelmed? Try a thought record.",
      mode: "thoughtrecord",
    });
  });

  it("routes through the existing suggestion slot — no second auxiliary element", () => {
    // WelcomeEmptyState shows at most one auxiliary element and continuity
    // still wins; F6 must not have added a parallel surface.
    const suggestion = buildWelcomeSuggestion(0, []);
    expect(pickAuxiliaryElement(null, suggestion)).toBe("suggestion");
    expect(
      pickAuxiliaryElement(
        { kind: "session", text: "pick up where you left off" } as never,
        suggestion
      )
    ).toBe("continuity");

    const welcome = read("../../components/WelcomeEmptyState.tsx");
    expect(welcome.match(/auxiliary === /g)).toHaveLength(2);
  });
});

describe("F6 (a) — all four modes are visible at phone widths", () => {
  const selector = read("../../components/JournalingModeSelector.tsx");

  it("the mode strip wraps instead of hiding labels behind a scrollbar", () => {
    expect(selector).toContain("flex-wrap");
    expect(selector).not.toContain("overflow-x-auto");
  });

  it("still a radiogroup, still four modes", () => {
    expect(selector).toContain('role="radiogroup"');
    for (const label of ["Free Write", "Gratitude", "Check-in", "Thought Record"]) {
      expect(selector).toContain(label);
    }
  });
});
