import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  shouldStartNewSessionOnModeChange,
  shouldPersistThoughtRecord,
} from "../modeSwitch";
import { deriveGuidedStep, resolveSessionMode } from "../guidedSession";
import type { Session } from "../../types";
import type { JournalingMode } from "../../components/JournalingModeSelector";

// F5 (field note docs/field-notes/2026-08-11-first-tester.md §A2 + addendum).
// Switching journaling mode mid-session was four coupled bugs. Each block
// below fails against the pre-F5 handler (`setJournalingMode(mode)` alone),
// which is modelled here as `legacyModeChange` so the bite is explicit.

function sessionWith(userTurns: number, mode?: JournalingMode): Session {
  return {
    id: "s1",
    title: "entry",
    affirmation: "",
    questions: [],
    threads: [
      {
        id: "t1",
        title: "Conversation",
        createdAt: 0,
        updatedAt: 0,
        messages: Array.from({ length: userTurns * 2 }, (_, i) => ({
          id: `m${i}`,
          role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
          content: i % 2 === 0 ? `turn ${i / 2 + 1} — grateful for the quiet` : "reply",
          ts: 0,
        })),
      },
    ],
    createdAt: 0,
    updatedAt: 0,
    model: { modelUrl: "", modelId: "test", localId: "test" },
    ...(mode ? { mode } : {}),
  };
}

interface AppishState {
  current: Session | null;
  mode: JournalingMode;
}

/** The pre-F5 behaviour: set the mode, leave the session alone. */
function legacyModeChange(state: AppishState, next: JournalingMode): AppishState {
  return { ...state, mode: next };
}

/** The F5 behaviour, mirroring App.tsx's handleJournalingModeChange. */
function f5ModeChange(state: AppishState, next: JournalingMode): AppishState {
  const startNew = shouldStartNewSessionOnModeChange(state.current, state.mode, next);
  return { current: startNew ? null : state.current, mode: next };
}

// Field note §A1: on a ~390px phone the header was four unlabelled icons, so
// the tester reached for browser refresh instead. Source-level guard, same
// pattern as VisualCalmGuards.
describe("F5 / A1 — the New control is labelled at phone widths", () => {
  const appSource = readFileSync(
    fileURLToPath(new URL("../../App.tsx", import.meta.url)),
    "utf-8"
  );
  const newButton = appSource.slice(
    appSource.indexOf('aria-label="Start new session"') - 700,
    appSource.indexOf('aria-label="Start new session"') + 300
  );

  it("does not hide the New label below the sm breakpoint", () => {
    expect(newButton).toContain(">New<");
    expect(newButton).not.toContain('<span className="hidden sm:inline">New</span>');
  });

  it("keeps a mobile-only tint so New is distinguishable from the icon buttons", () => {
    expect(newButton).toContain("bg-indigo-50/70 sm:bg-transparent");
  });
});

describe("F5 — switching modes starts a new entry", () => {
  describe("shouldStartNewSessionOnModeChange", () => {
    it("is true when a session with content changes mode", () => {
      expect(
        shouldStartNewSessionOnModeChange(sessionWith(3, "gratitude"), "gratitude", "checkin")
      ).toBe(true);
    });

    it("is false on the empty state — the welcome card's mode suggestion must not change", () => {
      expect(shouldStartNewSessionOnModeChange(null, "freewrite", "thoughtrecord")).toBe(false);
    });

    it("is false when the same mode is re-selected", () => {
      expect(
        shouldStartNewSessionOnModeChange(sessionWith(3, "gratitude"), "gratitude", "gratitude")
      ).toBe(false);
    });
  });

  describe("defect 1 — the new mode's prompt must not land on the old transcript", () => {
    const start: AppishState = { current: sessionWith(3, "gratitude"), mode: "gratitude" };

    it("bites pre-change: the legacy handler keeps the gratitude transcript under Check-in", () => {
      const after = legacyModeChange(start, "checkin");
      expect(after.mode).toBe("checkin");
      expect(after.current).not.toBeNull();
    });

    it("after F5 there is no transcript for the new mode's prompt to land on", () => {
      const after = f5ModeChange(start, "checkin");
      expect(after.mode).toBe("checkin");
      expect(after.current).toBeNull();
    });
  });

  describe("defect 2 — a reload must not revert the switch", () => {
    it("bites pre-change: the stored mode still says gratitude, so resolveSessionMode reverts", () => {
      const after = legacyModeChange({ current: sessionWith(3, "gratitude"), mode: "gratitude" }, "checkin");
      expect(resolveSessionMode(after.current)).toBe("gratitude");
      expect(resolveSessionMode(after.current)).not.toBe(after.mode);
    });

    it("after F5 there is no stale session to restore a stale mode from", () => {
      const after = f5ModeChange({ current: sessionWith(3, "gratitude"), mode: "gratitude" }, "checkin");
      expect(after.current).toBeNull();
    });
  });

  describe("defect 3 — the new guide must start at step 1, not 'Complete'", () => {
    it("bites pre-change: 3 gratitude turns land Check-in on step 4 of 3", () => {
      const after = legacyModeChange({ current: sessionWith(3, "gratitude"), mode: "gratitude" }, "checkin");
      const step = deriveGuidedStep(after.current);
      expect(step).toBe(4);
      expect(step > 3).toBe(true); // CheckInGuide.tsx:63 renders "Complete"
    });

    it("after F5 the Check-in guide derives step 1", () => {
      const after = f5ModeChange({ current: sessionWith(3, "gratitude"), mode: "gratitude" }, "checkin");
      expect(deriveGuidedStep(after.current)).toBe(1);
    });
  });

  describe("defect 4 — no fabricated ThoughtRecord may be written to storage", () => {
    const fiveTurnsOfGratitude: AppishState = {
      current: sessionWith(5, "gratitude"),
      mode: "gratitude",
    };

    it("bites pre-change: the save condition is already satisfied before the user types", () => {
      const after = legacyModeChange(fiveTurnsOfGratitude, "thoughtrecord");
      // The pre-F5 App.tsx condition, verbatim: mode + step + a live session.
      const legacyWouldSave =
        after.mode === "thoughtrecord" && deriveGuidedStep(after.current) > 5 && !!after.current;
      expect(legacyWouldSave).toBe(true);
    });

    it("after F5 nothing is persisted — the session was cleared", () => {
      const after = f5ModeChange(fiveTurnsOfGratitude, "thoughtrecord");
      expect(
        shouldPersistThoughtRecord({
          mode: after.mode,
          session: after.current,
          savedSessionId: null,
        })
      ).toBe(false);
    });

    it("second line of defence: a session written in another mode is never filed as a record", () => {
      expect(
        shouldPersistThoughtRecord({
          mode: "thoughtrecord",
          session: sessionWith(6, "gratitude"),
          savedSessionId: null,
        })
      ).toBe(false);
    });

    it("still saves a real thought record at step 6", () => {
      expect(
        shouldPersistThoughtRecord({
          mode: "thoughtrecord",
          session: sessionWith(6, "thoughtrecord"),
          savedSessionId: null,
        })
      ).toBe(true);
    });

    it("does not save before step 6", () => {
      expect(
        shouldPersistThoughtRecord({
          mode: "thoughtrecord",
          session: sessionWith(4, "thoughtrecord"),
          savedSessionId: null,
        })
      ).toBe(false);
    });

    it("does not save the same session twice", () => {
      expect(
        shouldPersistThoughtRecord({
          mode: "thoughtrecord",
          session: sessionWith(6, "thoughtrecord"),
          savedSessionId: "s1",
        })
      ).toBe(false);
    });

    it("pre-R9 sessions carry no mode and keep their old behaviour", () => {
      expect(
        shouldPersistThoughtRecord({
          mode: "thoughtrecord",
          session: sessionWith(6),
          savedSessionId: null,
        })
      ).toBe(true);
    });
  });
});
