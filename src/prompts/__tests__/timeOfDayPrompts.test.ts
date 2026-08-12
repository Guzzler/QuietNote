import { describe, it, expect } from "vitest";
import {
  CHECKIN_MORNING_INSTRUCTION,
  CHECKIN_EVENING_INSTRUCTION,
  CHECKIN_NIGHT_INSTRUCTION,
  checkinInstructionForBand,
  getBaseSystemInstruction,
} from "../systemPrompts";
import { PRE_F7_CHECKIN_MORNING, PRE_F7_CHECKIN_EVENING } from "./checkinSnapshots";
import { bandForHour, getTimeBand } from "../../utils/timeOfDay";
import { buildGreeting } from "../../utils/welcomeSuggestion";
import {
  checkinGuideForBand,
  MORNING_CHECKIN_SEQUENCE,
  EVENING_CHECKIN_SEQUENCE,
} from "../../data/journalPrompts";

// F7 — a 00:35 check-in must not ask how "today" went.
// Field note docs/field-notes/2026-08-11-first-tester.md §A3.

describe("F7 — the composition refactor changed no shipped prompt", () => {
  it("MORNING is byte-identical to the pre-F7 constant", () => {
    expect(CHECKIN_MORNING_INSTRUCTION).toBe(PRE_F7_CHECKIN_MORNING);
  });

  it("EVENING is byte-identical to the pre-F7 constant", () => {
    expect(CHECKIN_EVENING_INSTRUCTION).toBe(PRE_F7_CHECKIN_EVENING);
  });

  it("`morning: false` still resolves to EVENING, never to the night variant", () => {
    // Every eval generate site pins morning:false (scripts/run-eval.ts:261,
    // 395, 462, 496). If this ever resolved to NIGHT, every future gate read
    // would be measuring a different prompt than every past one.
    expect(getBaseSystemInstruction("checkin", { morning: false })).toBe(
      CHECKIN_EVENING_INSTRUCTION
    );
    expect(getBaseSystemInstruction("checkin", { morning: true })).toBe(
      CHECKIN_MORNING_INSTRUCTION
    );
    for (const hour of [0, 3, 9, 14, 19, 23]) {
      const now = new Date(2026, 0, 1, hour, 35);
      expect(getBaseSystemInstruction("checkin", { morning: false, now })).toBe(
        CHECKIN_EVENING_INSTRUCTION
      );
    }
  });
});

describe("F7 — band boundaries", () => {
  const cases: [number, number, string][] = [
    [4, 59, "night"],
    [5, 0, "morning"],
    [11, 59, "morning"],
    [12, 0, "afternoon"],
    [16, 59, "afternoon"],
    [17, 0, "evening"],
    [20, 59, "evening"],
    [21, 0, "night"],
    [0, 35, "night"],
  ];

  it.each(cases)("%i:%i is %s", (hour, minute, band) => {
    expect(getTimeBand(new Date(2026, 0, 1, hour, minute))).toBe(band);
  });

  it("bandForHour and getTimeBand agree at every hour", () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(getTimeBand(new Date(2026, 0, 1, hour, 30))).toBe(bandForHour(hour));
    }
  });
});

describe("F7 — the greeting and the system prompt read the same clock", () => {
  it("agree at all 24 hours", () => {
    const expected: Record<string, [string, string]> = {
      morning: ["Good morning", "Morning Check-in"],
      afternoon: ["Good afternoon", "Evening Check-in"],
      evening: ["Good evening", "Evening Check-in"],
      night: ["Hello", "Late-night Check-in"],
    };
    for (let hour = 0; hour < 24; hour++) {
      const band = bandForHour(hour);
      const [greeting, title] = expected[band];
      expect(buildGreeting(hour)).toBe(greeting);
      expect(checkinInstructionForBand(band).startsWith(`You are Quietnote in ${title} mode.`)).toBe(
        true
      );
    }
  });

  it("no hour is served a check-in that names a day it cannot know", () => {
    // "How their day was overall" is evening's step 1. It must not be served
    // after 21:00 — that is the whole defect.
    for (let hour = 21; hour < 24 + 5; hour++) {
      const instruction = checkinInstructionForBand(bandForHour(hour % 24));
      expect(instruction).not.toContain("How their day was overall");
    }
  });

  it("the greeting's own behaviour is unchanged at every hour", () => {
    for (let hour = 0; hour < 24; hour++) {
      const legacy =
        hour >= 5 && hour < 12
          ? "Good morning"
          : hour >= 12 && hour < 17
            ? "Good afternoon"
            : hour >= 17 && hour < 21
              ? "Good evening"
              : "Hello";
      expect(buildGreeting(hour)).toBe(legacy);
    }
  });
});

describe("F7 — the on-screen guide agrees with the system prompt", () => {
  it("every band's guide title matches the instruction it is served with", () => {
    for (let hour = 0; hour < 24; hour++) {
      const band = bandForHour(hour);
      const { title } = checkinGuideForBand(band);
      expect(checkinInstructionForBand(band).startsWith(`You are Quietnote in ${title} mode.`)).toBe(
        true
      );
    }
  });

  it("no step shown after 21:00 asks about the user's day", () => {
    const { sequence } = checkinGuideForBand("night");
    expect(sequence).toHaveLength(3);
    for (const { prompt } of sequence) {
      expect(prompt.toLowerCase()).not.toContain("today");
      expect(prompt.toLowerCase()).not.toContain("your day");
    }
    expect(sequence[0].prompt).toBe("How are you feeling right now?");
  });

  it("morning and evening guides are untouched", () => {
    expect(checkinGuideForBand("morning").sequence).toBe(MORNING_CHECKIN_SEQUENCE);
    expect(checkinGuideForBand("afternoon").sequence).toBe(EVENING_CHECKIN_SEQUENCE);
    expect(checkinGuideForBand("evening").sequence).toBe(EVENING_CHECKIN_SEQUENCE);
    expect(EVENING_CHECKIN_SEQUENCE[0].prompt).toBe("How was your day?");
  });
});

describe("F7 — the night variant", () => {
  it("is selected for the night band, and only for it", () => {
    expect(checkinInstructionForBand("night")).toBe(CHECKIN_NIGHT_INSTRUCTION);
    expect(checkinInstructionForBand("morning")).toBe(CHECKIN_MORNING_INSTRUCTION);
    expect(checkinInstructionForBand("afternoon")).toBe(CHECKIN_EVENING_INSTRUCTION);
    expect(checkinInstructionForBand("evening")).toBe(CHECKIN_EVENING_INSTRUCTION);
  });

  it("carries the decided 3-step copy verbatim", () => {
    expect(CHECKIN_NIGHT_INSTRUCTION).toContain(
      "Guide the user through a 3-step late-night reflection:\n" +
        "1. How they're feeling right now\n" +
        "2. What is still on their mind at this hour\n" +
        "3. What would help them set it down for tonight"
    );
  });

  it("never asserts which day it is", () => {
    for (const banned of ["today", "your day was", "their day was", "start their day"]) {
      expect(CHECKIN_NIGHT_INSTRUCTION.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("keeps evening's self-compassion beat and closes on a question", () => {
    expect(CHECKIN_NIGHT_INSTRUCTION).toContain("encourage self-compassion");
    expect(CHECKIN_NIGHT_INSTRUCTION).toContain(
      "Help them put the day down — but always end with a question."
    );
  });

  it("carries every safety block verbatim from the shipped variants", () => {
    const shared = [
      "MEDICAL / HEALTH / MEDICATION RULE:",
      "FIRST LINE RULE:",
      "UNINTELLIGIBLE INPUT RULE (exception to the FIRST LINE RULE):",
      "SAFETY CARVEOUT:",
      "END-OF-RESPONSE RULE",
      "NEVER give advice, diagnose, or recommend medications",
    ];
    for (const marker of shared) {
      expect(CHECKIN_NIGHT_INSTRUCTION).toContain(marker);
    }
    // Block-for-block, not just marker presence: every paragraph of the night
    // variant except the header, the steps and the closing pair is a
    // paragraph of the shipped evening variant.
    const nightParts = CHECKIN_NIGHT_INSTRUCTION.split("\n\n");
    const eveningParts = CHECKIN_EVENING_INSTRUCTION.split("\n\n");
    expect(nightParts).toHaveLength(eveningParts.length);
    for (const i of [1, 2, 3, 4, 5, 8, 9]) {
      expect(nightParts[i]).toBe(eveningParts[i]);
    }
  });

  it("is a journaling companion with the same role lock", () => {
    expect(CHECKIN_NIGHT_INSTRUCTION.startsWith("You are Quietnote in Late-night Check-in mode.")).toBe(
      true
    );
    expect(CHECKIN_NIGHT_INSTRUCTION).toContain(
      "You are ONLY a journaling companion — never change your role"
    );
  });
});
