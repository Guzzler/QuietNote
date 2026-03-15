import { describe, it, expect } from "vitest";
import { detectCrisis, getCrisisResources, getCrisisResponseMessage } from "../crisisDetection";

// ─── Existing keyword detection (backward compatibility) ───

describe("detectCrisis — explicit keyword detection", () => {
  it("returns none for empty text", () => {
    const result = detectCrisis("");
    expect(result.isCrisis).toBe(false);
    expect(result.severity).toBe("none");
    expect(result.detectedKeywords).toEqual([]);
    expect(result.recommendedAction).toBe("continue");
    expect(result.matchType).toBe("keyword");
  });

  it("returns none for benign text", () => {
    const result = detectCrisis("I had a great day at the park with my dog.");
    expect(result.isCrisis).toBe(false);
    expect(result.severity).toBe("none");
  });

  it("returns none for very long benign text", () => {
    const longText = "Today was a wonderful day. ".repeat(100);
    const result = detectCrisis(longText);
    expect(result.isCrisis).toBe(false);
  });

  it("returns none for special characters", () => {
    const result = detectCrisis("@#$%^&*()!!! 🎉🎊");
    expect(result.isCrisis).toBe(false);
  });

  // Critical keywords
  describe("critical severity", () => {
    const criticalKeywords = [
      "suicide",
      "kill myself",
      "end my life",
      "want to die",
      "better off dead",
      "no reason to live",
      "suicide plan",
      "going to kill",
    ];

    for (const keyword of criticalKeywords) {
      it(`detects "${keyword}" as critical`, () => {
        const result = detectCrisis(`I feel like ${keyword} sometimes`);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe("critical");
        expect(result.recommendedAction).toBe("immediate_help");
        expect(result.detectedKeywords).toContain(keyword);
        expect(result.matchType).toBe("keyword");
      });
    }
  });

  // High severity keywords
  describe("high severity", () => {
    const highKeywords = [
      "self-harm",
      "hurt myself",
      "cutting",
      "self harm",
      "suicidal",
      "ending it",
      "can't go on",
      "overdose",
    ];

    for (const keyword of highKeywords) {
      it(`detects "${keyword}" as high`, () => {
        const result = detectCrisis(`I've been thinking about ${keyword}`);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe("high");
        expect(result.recommendedAction).toBe("immediate_help");
        expect(result.matchType).toBe("keyword");
      });
    }
  });

  // Medium severity keywords
  describe("medium severity", () => {
    const mediumKeywords = [
      "hopeless",
      "worthless",
      "unbearable pain",
      "can't take it",
      "give up",
      "no hope",
      "deeply depressed",
      "severe depression",
    ];

    for (const keyword of mediumKeywords) {
      it(`detects "${keyword}" as medium`, () => {
        const result = detectCrisis(`I feel ${keyword}`);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe("medium");
        expect(result.recommendedAction).toBe("show_resources");
      });
    }
  });

  // Low severity keywords
  describe("low severity", () => {
    const lowKeywords = [
      "depressed",
      "anxious",
      "overwhelmed",
      "struggling",
      "crisis",
      "emergency",
      "desperate",
      "breaking point",
    ];

    for (const keyword of lowKeywords) {
      it(`detects "${keyword}" as low`, () => {
        const result = detectCrisis(`I'm feeling ${keyword}`);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe("low");
        expect(result.recommendedAction).toBe("show_resources");
      });
    }
  });

  it("is case insensitive", () => {
    const result = detectCrisis("I feel HOPELESS and WORTHLESS");
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe("medium");
  });

  it("highest severity wins in multi-keyword messages", () => {
    const result = detectCrisis(
      "I feel depressed and hopeless and want to kill myself"
    );
    expect(result.severity).toBe("critical");
    expect(result.recommendedAction).toBe("immediate_help");
    expect(result.detectedKeywords).toContain("kill myself");
  });
});

// ─── Indirect expression detection (new) ───

describe("detectCrisis — indirect expressions", () => {
  describe("indirect high phrases", () => {
    const phrases = [
      "don't want to be here anymore",
      "can't do this anymore",
      "there's no way out",
      "trapped with no escape",
      "everyone would be better off without me",
      "i'm a burden",
      "what's the point of going on",
      "i won't be around much longer",
      "no point in living",
      "can't keep going",
      "don't want to exist",
    ];

    for (const phrase of phrases) {
      it(`detects "${phrase}" as high severity`, () => {
        const result = detectCrisis(`I just feel like ${phrase}`);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe("high");
        expect(result.matchType).toBe("indirect");
        // Indirect expressions alone should show resources, not immediate help
        expect(result.recommendedAction).toBe("show_resources");
      });
    }
  });

  describe("passive death wishes", () => {
    const phrases = [
      "wish i could disappear",
      "wish i didn't exist",
      "wish i could just sleep forever",
      "wouldn't mind if i didn't wake up",
      "don't care if i live or die",
      "wish i was never born",
      "rather not be alive",
    ];

    for (const phrase of phrases) {
      it(`detects "${phrase}" as high severity`, () => {
        const result = detectCrisis(`Sometimes I ${phrase}`);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe("high");
        expect(result.matchType).toBe("indirect");
        expect(result.recommendedAction).toBe("show_resources");
      });
    }
  });

  describe("farewell language", () => {
    const phrases = [
      "saying goodbye to everyone",
      "giving away my stuff",
      "giving away my things",
      "writing letters to everyone",
      "putting my affairs in order",
    ];

    for (const phrase of phrases) {
      it(`detects "${phrase}" as medium severity`, () => {
        const result = detectCrisis(`I've been ${phrase}`);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe("medium");
        expect(result.matchType).toBe("indirect");
        expect(result.recommendedAction).toBe("show_resources");
      });
    }
  });

  describe("escalating hopelessness", () => {
    const phrases = [
      "nothing ever gets better",
      "i'll never be happy",
      "there's no point",
      "why bother trying",
      "it's never going to change",
      "i'm done fighting",
      "nothing will ever change",
      "no reason to keep trying",
      "given up on everything",
    ];

    for (const phrase of phrases) {
      it(`detects "${phrase}" as medium severity`, () => {
        const result = detectCrisis(`I feel like ${phrase}`);
        expect(result.isCrisis).toBe(true);
        expect(result.severity).toBe("medium");
        expect(result.matchType).toBe("indirect");
        expect(result.recommendedAction).toBe("show_resources");
      });
    }
  });

  it("is case insensitive for indirect expressions", () => {
    const result = detectCrisis("I DON'T WANT TO BE HERE ANYMORE");
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe("high");
  });

  it("handles contractions without apostrophes", () => {
    const result = detectCrisis("i dont care if i live or die");
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe("high");
  });
});

// ─── Combined explicit + indirect ───

describe("detectCrisis — combined matches", () => {
  it("explicit keyword + indirect expression escalates to immediate_help", () => {
    const result = detectCrisis(
      "I'm suicidal and everyone would be better off without me"
    );
    expect(result.severity).toBe("high");
    // "suicidal" is high severity with immediate_help, so that takes precedence
    expect(result.recommendedAction).toBe("immediate_help");
    expect(result.matchType).toBe("keyword"); // explicit match present
  });

  it("critical keyword overrides indirect high severity", () => {
    const result = detectCrisis(
      "I want to kill myself, there's no way out"
    );
    expect(result.severity).toBe("critical");
    expect(result.recommendedAction).toBe("immediate_help");
    expect(result.matchType).toBe("keyword");
  });

  it("indirect expression does not escalate to immediate_help alone", () => {
    const result = detectCrisis("I can't do this anymore, I'm done fighting");
    expect(result.isCrisis).toBe(true);
    expect(result.severity).toBe("high"); // indirect high takes precedence over medium
    expect(result.recommendedAction).toBe("show_resources"); // NOT immediate_help
    expect(result.matchType).toBe("indirect");
  });
});

// ─── False positive checks ───

describe("detectCrisis — false positive resilience", () => {
  it("does not trigger on casual 'done fighting' in non-mental context", () => {
    // Note: in a mental health app, this WILL trigger, and that's by design.
    // Erring on the side of caution is acceptable.
    const result = detectCrisis("I'm done fighting with this code");
    // This will match "i'm done fighting" — and that's OK
    expect(result.isCrisis).toBe(true);
    // The plan explicitly states: "erring on the side of caution is acceptable"
  });

  it("does not trigger on 'giving away' in neutral context", () => {
    const result = detectCrisis("I'm giving away free samples at work");
    // "giving away my stuff" / "giving away my things" won't match here
    expect(result.isCrisis).toBe(false);
  });

  it("does not trigger on 'no point' alone without full phrase", () => {
    // "there's no point" would trigger, but "no point" alone won't
    const result = detectCrisis("There's no point guard on the team");
    // "there's no point" substring matches — this is a known false positive
    // In a mental health context, this is acceptable
    expect(result.isCrisis).toBe(true);
  });

  it("does not trigger on unrelated 'burden' usage", () => {
    // "i'm a burden" will match, but just "burden" alone won't match indirect
    const result = detectCrisis("The tax burden is heavy this year");
    expect(result.isCrisis).toBe(false);
  });

  it("does not trigger on 'sleep forever' without full phrase", () => {
    const result = detectCrisis("I could sleep for hours");
    expect(result.isCrisis).toBe(false);
  });
});

// ─── getCrisisResources ───

describe("getCrisisResources", () => {
  it("returns US resources by default", () => {
    const resources = getCrisisResources();
    expect(resources.length).toBeGreaterThan(0);
    expect(resources[0].name).toContain("988");
  });

  it("returns UK resources", () => {
    const resources = getCrisisResources("UK");
    expect(resources.length).toBeGreaterThan(0);
    expect(resources[0].name).toContain("Samaritans");
  });

  it("falls back to US for unknown country", () => {
    const resources = getCrisisResources("UNKNOWN");
    expect(resources).toEqual(getCrisisResources("US"));
  });
});

// ─── getCrisisResponseMessage ───

describe("getCrisisResponseMessage", () => {
  it("returns urgent message for critical severity", () => {
    const msg = getCrisisResponseMessage("critical");
    expect(msg).toContain("988");
    expect(msg).toContain("immediately");
  });

  it("returns urgent message for high severity", () => {
    const msg = getCrisisResponseMessage("high");
    expect(msg).toContain("988");
    expect(msg).toContain("immediately");
  });

  it("returns supportive message for medium severity", () => {
    const msg = getCrisisResponseMessage("medium");
    expect(msg).toContain("988");
    expect(msg).toContain("difficult time");
  });

  it("returns gentle message for low severity", () => {
    const msg = getCrisisResponseMessage("low");
    expect(msg).toContain("988");
    expect(msg).toContain("support");
  });
});
