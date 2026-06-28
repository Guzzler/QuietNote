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

// ── UNINTELLIGIBLE INPUT RULE contract (Day-12b / B2, 2026-06-13) ──
// All 5 prompts gained a clarify-don't-project beat, scoped as an explicit
// exception to the FIRST LINE RULE, so gibberish/punctuation-only input gets a
// plain "I didn't quite catch that" instead of a manufactured emotional read.
// These tests pin the beat and confirm it uses scorer-accepted clarify wording
// without weakening the SAFETY CARVEOUT.

describe("UNINTELLIGIBLE INPUT RULE contract (all 5 prompts)", () => {
  const PROMPTS = [
    ["freewrite", SYSTEM_INSTRUCTION],
    ["gratitude", GRATITUDE_SYSTEM_INSTRUCTION],
    ["checkin-morning", CHECKIN_MORNING_INSTRUCTION],
    ["checkin-evening", CHECKIN_EVENING_INSTRUCTION],
    ["thoughtrecord", THOUGHT_RECORD_INSTRUCTION],
  ] as const;

  it.each(PROMPTS)("%s carries the clarify beat scoped as a FIRST LINE RULE exception", (_label, prompt) => {
    expect(prompt).toContain("UNINTELLIGIBLE INPUT RULE (exception to the FIRST LINE RULE)");
    // Scorer-accepted plain-clarify phrasing must appear in the example.
    expect(prompt).toMatch(/didn't quite catch/i);
    expect(prompt).toMatch(/could you tell me more/i);
  });

  it.each(PROMPTS)("%s tells the model not to invent an emotion or concrete detail from noise", (_label, prompt) => {
    expect(prompt).toContain("do NOT guess at or name any emotion");
    expect(prompt).toContain(`do NOT invent a "concrete detail" from the noise`);
  });

  it("does not weaken the gratitude SAFETY CARVEOUT", () => {
    // The carveout text must still be present and the beat must mark itself
    // separate from it (gibberish is not a crisis signal).
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain("SAFETY CARVEOUT — strictest rule");
    expect(GRATITUDE_SYSTEM_INSTRUCTION).toContain("gibberish is not a crisis signal");
  });

  it.each([
    ["checkin-morning", CHECKIN_MORNING_INSTRUCTION],
    ["checkin-evening", CHECKIN_EVENING_INSTRUCTION],
    ["thoughtrecord", THOUGHT_RECORD_INSTRUCTION],
  ] as const)("%s keeps its SAFETY CARVEOUT alongside the new beat", (_label, prompt) => {
    expect(prompt).toContain("SAFETY CARVEOUT");
    expect(prompt).toContain("gibberish is not a crisis signal");
  });
});

// ── MEDICAL PRECEDENCE contract (Day-23, 2026-06-25) ──
// Thought Record mode's 5-step "always advance" scaffolding was out-competing
// the MEDICAL RULE, so a health/medication turn could be pulled into a CBT step
// with no referral (omission). The MEDICAL PRECEDENCE clause makes the referral
// out-rank the steps, with an explicit carve so ordinary emotions don't
// over-trigger a referral. Pin both halves so a future edit can't silently drop
// the precedence or its non-medical exclusion.
describe("Thought Record MEDICAL PRECEDENCE contract", () => {
  it("makes the medical referral out-rank the CBT steps", () => {
    expect(THOUGHT_RECORD_INSTRUCTION).toContain("MEDICAL PRECEDENCE");
    expect(THOUGHT_RECORD_INSTRUCTION).toContain("overrides the CBT steps");
  });

  it("carves out ordinary emotions so it does not over-trigger", () => {
    expect(THOUGHT_RECORD_INSTRUCTION).toContain("are NOT health topics and must NOT trigger a referral");
  });
});

// ── GENERAL-TERMS REFERRAL contract (Day-24, 2026-06-27) ──
// The MEDICAL RULE told the model to refer but said nothing about not repeating
// the user's specific clinical term, so a correct referral still tripped the
// scorer's mustNotContainAny bans by echoing the user's banned word
// (the scorer-echo collision). The GENERAL-TERMS REFERRAL beat scopes
// "don't echo the clinical term" to health-topic turns only, leaving the
// FIRST LINE RULE empathy-echo intact on ordinary turns. Pin the beat in all 5
// prompts, and confirm the referral keyword list is NOT weakened.
describe("GENERAL-TERMS REFERRAL contract (all 5 prompts)", () => {
  const PROMPTS = [
    ["freewrite", SYSTEM_INSTRUCTION],
    ["gratitude", GRATITUDE_SYSTEM_INSTRUCTION],
    ["checkin-morning", CHECKIN_MORNING_INSTRUCTION],
    ["checkin-evening", CHECKIN_EVENING_INSTRUCTION],
    ["thoughtrecord", THOUGHT_RECORD_INSTRUCTION],
  ] as const;

  it.each(PROMPTS)("%s carries the GENERAL-TERMS REFERRAL beat", (_label, prompt) => {
    expect(prompt).toContain("GENERAL-TERMS REFERRAL");
    expect(prompt).toContain(
      "do NOT repeat the specific medication, dose, milligram amount, supplement, or remedy name they used"
    );
  });

  it.each(PROMPTS)("%s grounds opening empathy in feeling, not the clinical term", (_label, prompt) => {
    expect(prompt).toContain("Ground your opening empathy in the feeling or situation");
  });

  it.each(PROMPTS)("%s still requires the referral keyword (constraint added, not weakened)", (_label, prompt) => {
    expect(prompt).toContain(
      `your response MUST include one of: "doctor", "therapist", "clinician", "professional", "provider"`
    );
  });

  it("THOUGHT_RECORD MEDICAL PRECEDENCE points to the GENERAL-TERMS REFERRAL rule", () => {
    expect(THOUGHT_RECORD_INSTRUCTION).toContain(
      "refer in general terms per the GENERAL-TERMS REFERRAL rule above"
    );
  });
});

describe("EVAL_CASES freeze — harness-expansion guard (Day-9 re-assert)", () => {
  it("EVAL_CASES.length matches the frozen count (75 after 2026-06-13 input_robustness freeze-lift)", () => {
    expect(EVAL_CASES.length).toBe(75);
  });
});
