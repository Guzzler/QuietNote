import { describe, it, expect } from "vitest";
import {
  REFERRAL_VOCAB,
  detectsMedicalTopic,
  hasReferral,
  needsReferralReprompt,
  shouldAttemptReferralReprompt,
  REFERRAL_REPROMPT_INSTRUCTION,
  withReferralReprompt,
} from "../referralReprompt";
import { EVAL_CASES, PROFESSIONAL_REFERRAL } from "../evalRunner";

/**
 * The referral cohort: every eval case whose pass criteria require referral
 * vocabulary in the response. This is the exact population the mechanism must
 * serve — and the complement is the population it must never touch.
 */
const referralSet = new Set(PROFESSIONAL_REFERRAL.map((t) => t.toLowerCase()));
const referralCohort = EVAL_CASES.filter((c) =>
  (c.passCriteria.mustContainAny ?? []).some((t) => referralSet.has(t.toLowerCase()))
);
const nonReferralCases = EVAL_CASES.filter((c) => !referralCohort.includes(c));

describe("REFERRAL_VOCAB sync", () => {
  it("is deep-equal to the scorer's PROFESSIONAL_REFERRAL (a scorer vocab change must update the app copy)", () => {
    expect(REFERRAL_VOCAB).toEqual(PROFESSIONAL_REFERRAL);
  });
});

describe("detectsMedicalTopic — EVAL_CASES corpus fire/no-fire proof", () => {
  it("sanity: the referral cohort is non-empty and includes the durable case", () => {
    expect(referralCohort.length).toBeGreaterThanOrEqual(15);
    expect(referralCohort.map((c) => c.id)).toContain("medical-2.10");
  });

  it("fires on EVERY referral-cohort prompt", () => {
    for (const c of referralCohort) {
      expect(detectsMedicalTopic(c.prompt), `expected fire on ${c.id}: ${c.prompt}`).toBe(true);
    }
  });

  it("fires on ZERO non-referral prompts (the over-trigger gate, G2)", () => {
    for (const c of nonReferralCases) {
      expect(detectsMedicalTopic(c.prompt), `unexpected fire on ${c.id}: ${c.prompt}`).toBe(
        false
      );
    }
  });
});

describe("detectsMedicalTopic — unit behavior", () => {
  it("detects the durable indirect phrasing", () => {
    expect(
      detectsMedicalTopic(
        "I'm grateful my sister finally said what everyone thinks — that I might be bipolar"
      )
    ).toBe(true);
  });

  it("does not fire on bare emotion words (everyday journaling vocabulary)", () => {
    expect(detectsMedicalTopic("I've been feeling really depressed lately")).toBe(false);
    expect(detectsMedicalTopic("I'm so anxious about tomorrow")).toBe(false);
    expect(detectsMedicalTopic("Today was sad but I'm grateful for my dog")).toBe(false);
  });

  it("respects word boundaries (no substring false positives)", () => {
    expect(detectsMedicalTopic("the smog was terrible today")).toBe(false); // not "mg"
    expect(detectsMedicalTopic("I dosed off during the meeting")).toBe(false); // not "dose"
    expect(detectsMedicalTopic("comedships")).toBe(false); // not "meds"
  });
});

describe("hasReferral", () => {
  it("true when any referral term appears (case-insensitive)", () => {
    expect(hasReferral("It might help to talk with a Therapist about this.")).toBe(true);
    expect(hasReferral("Please consider reaching out to a doctor.")).toBe(true);
    expect(hasReferral("A mental health professional could help.")).toBe(true);
  });

  it("false when no referral term appears", () => {
    expect(hasReferral("That sounds really hard. What felt heaviest today?")).toBe(false);
    expect(hasReferral("")).toBe(false);
  });
});

describe("needsReferralReprompt", () => {
  it("true: medical topic + referral-free response", () => {
    expect(
      needsReferralReprompt(
        "Do you think I might be bipolar?",
        "That sounds like a heavy thing to carry. What made today feel that way?"
      )
    ).toBe(true);
  });

  it("false: blank response", () => {
    expect(needsReferralReprompt("Do you think I might be bipolar?", "   ")).toBe(false);
  });

  it("false: referral already present", () => {
    expect(
      needsReferralReprompt(
        "Do you think I might be bipolar?",
        "I can't say — a doctor or therapist is the right person to explore that with."
      )
    ).toBe(false);
  });

  it("false: non-medical user turn", () => {
    expect(needsReferralReprompt("I had a terrible day at work", "Tell me more?")).toBe(false);
  });
});

describe("shouldAttemptReferralReprompt — suppression composition", () => {
  const medicalTurn = "Do you think I might be bipolar?";
  const bareResponse = "That sounds heavy. What happened today?";

  it("true when neither suppressor is active and the core predicate holds", () => {
    expect(
      shouldAttemptReferralReprompt(medicalTurn, bareResponse, {
        deflectionFired: false,
        crisisDetected: false,
      })
    ).toBe(true);
  });

  it("false when the deflection guard already fired (one extra generation per turn max)", () => {
    expect(
      shouldAttemptReferralReprompt(medicalTurn, bareResponse, {
        deflectionFired: true,
        crisisDetected: false,
      })
    ).toBe(false);
  });

  it("false on crisis-detected turns (crisis resources are the correct content)", () => {
    expect(
      shouldAttemptReferralReprompt(medicalTurn, bareResponse, {
        deflectionFired: false,
        crisisDetected: true,
      })
    ).toBe(false);
  });
});

describe("REFERRAL_REPROMPT_INSTRUCTION content", () => {
  it("primes scorer-visible referral vocabulary", () => {
    expect(REFERRAL_REPROMPT_INSTRUCTION).toMatch(/doctor/i);
    expect(REFERRAL_REPROMPT_INSTRUCTION).toMatch(/therapist/i);
  });

  it("explicitly forbids advice, dose guidance, and diagnosis", () => {
    expect(REFERRAL_REPROMPT_INSTRUCTION).toMatch(/medical advice/i);
    expect(REFERRAL_REPROMPT_INSTRUCTION).toMatch(/dose/i);
    expect(REFERRAL_REPROMPT_INSTRUCTION).toMatch(/diagnosis/i);
  });

  it("asks to keep the warmth (protects empathy dimensions)", () => {
    expect(REFERRAL_REPROMPT_INSTRUCTION).toMatch(/warm/i);
  });
});

describe("withReferralReprompt", () => {
  it("appends the instruction to the last user turn only, adding no new turns", () => {
    const messages = [
      { role: "system", content: "sys" },
      { role: "user", content: "first" },
      { role: "assistant", content: "reply" },
      { role: "user", content: "second" },
    ];
    const out = withReferralReprompt(messages);
    expect(out).toHaveLength(4);
    expect(out[1].content).toBe("first");
    expect(out[3].content).toBe(`second\n\n${REFERRAL_REPROMPT_INSTRUCTION}`);
    expect(out.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
  });

  it("handles arrays whose final message is not a user turn", () => {
    const messages = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];
    const out = withReferralReprompt(messages);
    expect(out[0].content).toBe(`hello\n\n${REFERRAL_REPROMPT_INSTRUCTION}`);
    expect(out[1].content).toBe("hi");
  });

  it("returns messages unchanged when there is no user turn", () => {
    const messages = [{ role: "system", content: "sys" }];
    expect(withReferralReprompt(messages)).toEqual(messages);
  });

  it("does not mutate the input array", () => {
    const messages = [{ role: "user", content: "hello" }];
    withReferralReprompt(messages);
    expect(messages[0].content).toBe("hello");
  });
});
