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
import { EVAL_CASES } from "../../utils/evalRunner";

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

// ── Prompt-contract tests (Day-9, 2026-06-09) ──
// The gratitude SAFETY CARVEOUT was rewritten into an explicit 3-beat
// acknowledge-then-redirect shape (the Day-6-settled curt-bail fix), and both
// check-in carveouts were hardened with an end-with-question rule. These
// tests pin the load-bearing instructions so a future prompt edit can't
// silently drop them.

describe("gratitude SAFETY CARVEOUT contract", () => {
  it("instructs that the response must end with a question", () => {
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain("MUST end with this question");
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain(`A response without a "?" is wrong`);
  });

  it("instructs naming the pain with feeling words, not abstractions", () => {
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain("name the pain behind their words");
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toMatch(/"hurt", "anger", or "pain"/);
  });

  it("forbids a resource-only response", () => {
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain("NEVER be the whole response");
  });

  it("contains a worked harm-intent example with a question-terminated assistant reply", () => {
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain("Example (harm intent):");
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain(
      "I'm going to hurt the person who hurt me."
    );
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain("what did they do that hurt you the most?");
  });

  it("bans gratitude vocabulary on distress turns", () => {
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toMatch(
      /do NOT use the words "grateful", "gratitude", or "thankful"/
    );
  });
});

describe("check-in SAFETY CARVEOUT contract", () => {
  const checkins = [
    ["morning", CHECKIN_MORNING_INSTRUCTION],
    ["evening", CHECKIN_EVENING_INSTRUCTION],
  ] as const;

  it.each(checkins)("%s retains the open-question instruction", (_label, prompt) => {
    expect(prompt).toContain("ask one open question grounded in what they said");
  });

  it.each(checkins)("%s makes the question the explicit terminator", (_label, prompt) => {
    expect(prompt).toContain("MUST END with that question");
  });

  it.each(checkins)("%s marks a resource-only response as wrong", (_label, prompt) => {
    expect(prompt).toContain(`A resource-only response with no acknowledgement and no "?" is wrong`);
  });
});

describe("safety markers survive the Day-9 edit (all 5 prompts)", () => {
  const PROMPTS = [
    ["freewrite", SYSTEM_INSTRUCTION],
    ["gratitude", GRATITUDE_SYSTEM_INSTRUCTION],
    ["checkin-morning", CHECKIN_MORNING_INSTRUCTION],
    ["checkin-evening", CHECKIN_EVENING_INSTRUCTION],
    ["thoughtrecord", THOUGHT_RECORD_INSTRUCTION],
  ] as const;

  it.each(PROMPTS)("%s contains the MEDICAL rule and FIRST LINE RULE", (_label, prompt) => {
    expect(prompt).toContain("MEDICAL / HEALTH / MEDICATION RULE");
    expect(prompt).toContain("FIRST LINE RULE");
  });
});

describe("EVAL_CASES freeze — harness-expansion guard (Day-9 re-assert)", () => {
  it("EVAL_CASES.length matches the frozen count (75 after 2026-06-13 input_robustness freeze-lift)", () => {
    expect(EVAL_CASES.length).toBe(75);
  });
});
