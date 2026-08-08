import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  countUserMessages,
  deriveGuidedStep,
  resolveSessionMode,
} from "../guidedSession";
import type { Session, ChatMessage, Role } from "../../types";

// R9 (2026-08-06) — guided sessions must be resumable, and a mid-exercise
// reload must not silently lose the Thought Record.
//
// Before this change `journalingMode` and the three step counters were plain
// React state in App.tsx: a reload dropped the mode entirely, and switching
// sessions reset the counter to 1 over a transcript plainly past step 1. The
// severe half was that the structured ThoughtRecord is only written when the
// step passes 5 — so an interrupted session could never reach the save
// condition again. The step is now DERIVED from the stored transcript, which
// cannot drift from it and makes the save condition reachable on resume.

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

let n = 0;
const msg = (role: Role, content: string): ChatMessage => ({
  id: `m${n++}`,
  role,
  content,
  ts: Date.now(),
});

/** A session as it comes back out of IndexedDB after a reload. */
function storedSession(
  userMessageCount: number,
  mode?: Session["mode"],
): Session {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < userMessageCount; i++) {
    messages.push(msg("user", `entry ${i + 1}`));
    messages.push(msg("assistant", `reply ${i + 1}`));
  }
  return {
    id: "s1",
    title: "Stored session",
    questions: [],
    threads: [
      {
        id: "t1",
        title: "Conversation",
        messages,
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    createdAt: 1,
    updatedAt: 2,
    model: { modelUrl: "", modelId: "", localId: "" },
    ...(mode ? { mode } : {}),
  };
}

describe("guided step is derived from the transcript (R9)", () => {
  it("counts user messages across every thread", () => {
    const s = storedSession(3);
    s.threads.push({
      id: "t2",
      title: "Second",
      messages: [msg("user", "elsewhere")],
      createdAt: 1,
      updatedAt: 2,
    });
    expect(countUserMessages(s)).toBe(4);
  });

  it("a session with 3 stored user messages derives step 4", () => {
    expect(deriveGuidedStep(storedSession(3))).toBe(4);
  });

  it("an empty or absent session is step 1", () => {
    expect(deriveGuidedStep(null)).toBe(1);
    expect(deriveGuidedStep(undefined)).toBe(1);
    expect(deriveGuidedStep(storedSession(0))).toBe(1);
  });

  it("the step never falls behind the transcript, at any length", () => {
    for (let i = 0; i <= 8; i++) {
      expect(deriveGuidedStep(storedSession(i))).toBe(i + 1);
    }
  });

  it("a restored 5-message thoughtrecord session reaches the > 5 save condition", () => {
    // This is the data-loss regression: App.tsx writes the structured
    // ThoughtRecord only when the step passes 5 AND ≥5 user messages exist.
    const restored = storedSession(5, "thoughtrecord");
    expect(deriveGuidedStep(restored)).toBeGreaterThan(5);
    expect(countUserMessages(restored)).toBeGreaterThanOrEqual(5);
  });

  it("a restored 4-message thoughtrecord session does NOT save early", () => {
    expect(deriveGuidedStep(storedSession(4, "thoughtrecord"))).toBe(5);
  });
});

describe("session mode survives a reload (R9)", () => {
  it("restores the mode the session was written in", () => {
    expect(resolveSessionMode(storedSession(2, "thoughtrecord"))).toBe("thoughtrecord");
    expect(resolveSessionMode(storedSession(1, "gratitude"))).toBe("gratitude");
    expect(resolveSessionMode(storedSession(1, "checkin"))).toBe("checkin");
  });

  it("a session with no mode is a free write — no migration needed", () => {
    expect(resolveSessionMode(storedSession(2))).toBe("freewrite");
    expect(resolveSessionMode(null)).toBe("freewrite");
  });
});

describe("App wiring (R9)", () => {
  const source = read("../../App.tsx");

  it("persists the mode on new sessions and restores it on load", () => {
    expect(source).toContain("mode: journalingMode");
    expect(source).toContain("setJournalingMode(resolveSessionMode(s))");
  });

  it("no longer carries ephemeral step counters or a reset effect", () => {
    expect(source).not.toContain("setGratitudeStep");
    expect(source).not.toContain("setCheckinStep");
    expect(source).not.toContain("setThoughtRecordStep");
  });

  it("the ThoughtRecord save condition reads the derived step", () => {
    expect(source).toContain("deriveGuidedStep(current)");
    expect(source).toContain("guidedStep <= 5");
  });
});
