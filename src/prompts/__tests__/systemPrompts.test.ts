import { describe, it, expect } from "vitest";
import {
  getBaseSystemInstruction,
  getSystemInstruction,
  SYSTEM_INSTRUCTION,
  GRATITUDE_SYSTEM_INSTRUCTION,
  CHECKIN_MORNING_INSTRUCTION,
  CHECKIN_EVENING_INSTRUCTION,
  THOUGHT_RECORD_INSTRUCTION,
} from "../systemPrompts";

// Guards the Node eval runner's input: the runner calls getBaseSystemInstruction,
// so this test ensures every mode returns a non-empty string containing the
// MEDICAL rule sentinel added 2026-05-30 (commit 5355f52). If a future prompt
// hoist drops the rule, the runner would silently measure a different prompt.

const MODES = ["freewrite", "gratitude", "checkin", "thoughtrecord"] as const;

describe("systemPrompts", () => {
  it("returns a non-empty string for every mode", () => {
    for (const mode of MODES) {
      const morning = getBaseSystemInstruction(mode, { morning: true });
      const evening = getBaseSystemInstruction(mode, { morning: false });
      expect(morning, `mode=${mode} morning`).toMatch(/\S/);
      expect(evening, `mode=${mode} evening`).toMatch(/\S/);
    }
  });

  it("includes the MEDICAL / HEALTH / MEDICATION rule in every mode", () => {
    const sentinel = "MEDICAL / HEALTH / MEDICATION RULE";
    for (const mode of MODES) {
      const morning = getBaseSystemInstruction(mode, { morning: true });
      const evening = getBaseSystemInstruction(mode, { morning: false });
      expect(morning, `mode=${mode} morning missing sentinel`).toContain(sentinel);
      expect(evening, `mode=${mode} evening missing sentinel`).toContain(sentinel);
    }
  });

  it("exposes the 5 prompt constants used by the app", () => {
    expect(SYSTEM_INSTRUCTION).toContain("FIRST LINE RULE");
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain("Gratitude Journaling mode");
    expect(CHECKIN_MORNING_INSTRUCTION).toContain("Morning Check-in mode");
    expect(CHECKIN_EVENING_INSTRUCTION).toContain("Evening Check-in mode");
    expect(THOUGHT_RECORD_INSTRUCTION).toContain("Thought Record mode");
  });

  it("getSystemInstruction appends context block when provided", () => {
    const withCtx = getSystemInstruction("freewrite", "User likes nature.");
    expect(withCtx).toContain("Context about this user:");
    expect(withCtx).toContain("User likes nature.");
  });

  it("getSystemInstruction returns base when no context/personality", () => {
    const base = getSystemInstruction("freewrite");
    expect(base).toBe(SYSTEM_INSTRUCTION);
  });
});
