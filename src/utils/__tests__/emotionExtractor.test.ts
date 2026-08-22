import { describe, it, expect } from "vitest";
import {
  extractEmotions,
  estimateIntensity,
  getTopEmotion,
} from "../emotionExtractor";

describe("extractEmotions", () => {
  it("returns empty array for empty text", () => {
    expect(extractEmotions("")).toEqual([]);
    expect(extractEmotions("  ")).toEqual([]);
  });

  it("detects a single emotion", () => {
    const result = extractEmotions("I'm feeling really anxious today");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].emotion).toBe("anxious");
    expect(result[0].matchedKeywords).toContain("anxious");
  });

  it("detects sadness keywords", () => {
    const result = extractEmotions(
      "I've been crying all day and feel so sad"
    );
    const sadMatch = result.find((r) => r.emotion === "sad");
    expect(sadMatch).toBeDefined();
    expect(sadMatch!.matchedKeywords).toContain("sad");
    expect(sadMatch!.matchedKeywords).toContain("crying");
  });

  it("detects happiness keywords", () => {
    const result = extractEmotions(
      "Today was wonderful, I feel so happy and cheerful"
    );
    const happyMatch = result.find((r) => r.emotion === "happy");
    expect(happyMatch).toBeDefined();
    expect(happyMatch!.matchedKeywords).toContain("happy");
    expect(happyMatch!.matchedKeywords).toContain("wonderful");
    expect(happyMatch!.matchedKeywords).toContain("cheerful");
  });

  it("detects multiple emotions", () => {
    const result = extractEmotions(
      "I feel anxious about work but grateful for my friends"
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    const emotions = result.map((r) => r.emotion);
    expect(emotions).toContain("anxious");
    expect(emotions).toContain("grateful");
  });

  it("returns results sorted by confidence descending", () => {
    const result = extractEmotions(
      "I'm feeling really sad and heartbroken, been crying all night, tears won't stop"
    );
    // Sad should have high confidence due to many keyword matches
    expect(result[0].emotion).toBe("sad");
    for (let i = 1; i < result.length; i++) {
      expect(result[i].confidence).toBeLessThanOrEqual(
        result[i - 1].confidence
      );
    }
  });

  it("returns empty for neutral text", () => {
    const result = extractEmotions("The weather is nice today");
    expect(result.length).toBe(0);
  });

  it("returns empty for very short neutral text", () => {
    const result = extractEmotions("ok");
    expect(result.length).toBe(0);
  });

  it("detects loneliness", () => {
    const result = extractEmotions(
      "I feel so alone and isolated, like nobody cares"
    );
    const lonelyMatch = result.find((r) => r.emotion === "lonely");
    expect(lonelyMatch).toBeDefined();
    // R18: bare "alone" retired in favour of framed forms; this sentence is
    // still lonely, now via "so alone" (plus "isolated" and "nobody cares").
    expect(lonelyMatch!.matchedKeywords).toContain("so alone");
    expect(lonelyMatch!.matchedKeywords).toContain("isolated");
  });

  it("detects frustration", () => {
    const result = extractEmotions("I'm so frustrated, feeling completely stuck");
    const frustratedMatch = result.find((r) => r.emotion === "frustrated");
    expect(frustratedMatch).toBeDefined();
  });

  it("detects calm/peaceful emotions", () => {
    const result = extractEmotions(
      "I feel calm and at peace after meditation"
    );
    const calmMatch = result.find((r) => r.emotion === "calm");
    expect(calmMatch).toBeDefined();
  });

  it("handles case insensitivity", () => {
    const result = extractEmotions("I'm REALLY ANXIOUS about tomorrow");
    const anxiousMatch = result.find((r) => r.emotion === "anxious");
    expect(anxiousMatch).toBeDefined();
  });
});

describe("estimateIntensity", () => {
  it("returns base intensity of 5 with no modifiers", () => {
    expect(estimateIntensity("I feel anxious", "anxious")).toBe(5);
  });

  it("increases intensity with amplifiers", () => {
    expect(estimateIntensity("I feel extremely anxious", "anxious")).toBe(8);
    expect(estimateIntensity("I feel really anxious", "anxious")).toBe(7);
    expect(estimateIntensity("I feel very anxious", "anxious")).toBe(7);
  });

  it("decreases intensity with dampeners", () => {
    expect(estimateIntensity("I feel a little anxious", "anxious")).toBe(3);
    expect(estimateIntensity("I feel slightly anxious", "anxious")).toBe(3);
    expect(estimateIntensity("I feel somewhat anxious", "anxious")).toBe(4);
  });

  it("clamps intensity to 1-10 range", () => {
    // Even with extreme modifiers, should stay in range
    const high = estimateIntensity(
      "I feel extremely incredibly really anxious",
      "anxious"
    );
    expect(high).toBeLessThanOrEqual(10);
    expect(high).toBeGreaterThanOrEqual(1);
  });

  it("returns 5 when no keyword matches", () => {
    expect(estimateIntensity("The weather is nice", "anxious")).toBe(5);
  });
});

describe("getTopEmotion", () => {
  it("returns null for empty text", () => {
    expect(getTopEmotion("")).toBeNull();
  });

  it("returns null for neutral text", () => {
    expect(getTopEmotion("The weather is nice")).toBeNull();
  });

  it("returns the highest confidence emotion", () => {
    const result = getTopEmotion("I feel really anxious and worried");
    expect(result).not.toBeNull();
    expect(result!.emotion).toBe("anxious");
  });

  it("respects minimum confidence threshold", () => {
    // Single keyword match with default threshold
    const result = getTopEmotion("I feel sad", 0.4);
    expect(result).not.toBeNull();

    // Very high threshold should filter out low-confidence matches
    const filtered = getTopEmotion("I feel sad", 0.99);
    expect(filtered).toBeNull();
  });

  it("returns emotion with intensity estimate", () => {
    const result = getTopEmotion("I feel extremely happy today");
    expect(result).not.toBeNull();
    expect(result!.emotion).toBe("happy");
    expect(result!.intensity).toBeGreaterThan(5);
  });
});

// R17 — two ordinary English words were read as feelings: bare "still" (calm)
// and bare "down" (sad). Both are \b-anchored but sense-blind, and one
// incidental hit scores 0.50 against the 0.4 threshold the app reads at.
describe("R17: incidental words are not read as feelings", () => {
  describe("A. false positives that must not fire", () => {
    const noEmotion = [
      "I still feel bad about how I handled that conversation",
      "I am still not over the argument with my brother",
      "I still feel guilty about missing the call",
      "I sat down and wrote out everything that went wrong today",
      "The server was down all afternoon and I got nothing done",
      "I calmed down after talking to her",
    ];

    for (const text of noEmotion) {
      it(`detects nothing in: ${text}`, () => {
        expect(getTopEmotion(text, 0.4)).toBeNull();
      });
    }

    const outrankedBy: [string, string][] = [
      ["Let me write this down before I forget how angry I was", "angry"],
      ["I am anxious about tomorrow and I sat down to breathe", "anxious"],
      ["I wrote down three things I was grateful for", "grateful"],
    ];

    for (const [text, expected] of outrankedBy) {
      it(`reports ${expected}, not sad, for: ${text}`, () => {
        const result = getTopEmotion(text, 0.4);
        expect(result).not.toBeNull();
        expect(result!.emotion).toBe(expected);
      });
    }
  });

  describe("B. true positives that must keep firing", () => {
    const stillSad: [string, string][] = [
      ["I have been feeling down since Monday", "feeling down"],
      ["I feel down about how the week went", "feel down"],
      ["I felt down all day and could not shake it", "felt down"],
      ["I have been feeling low all week", "feeling low"],
    ];

    for (const [text, keyword] of stillSad) {
      it(`still reports sad via "${keyword}" for: ${text}`, () => {
        const result = getTopEmotion(text, 0.4);
        expect(result).not.toBeNull();
        expect(result!.emotion).toBe("sad");
        expect(result!.matchedKeywords).toContain(keyword);
      });
    }

    it("still reports calm for a real statement of calm", () => {
      const result = getTopEmotion("I felt calm and settled after the walk", 0.4);
      expect(result).not.toBeNull();
      expect(result!.emotion).toBe("calm");
      expect(result!.confidence).toBeCloseTo(0.8);
    });
  });
});

// R18 — six more bare words were read as feelings: "content", "loss",
// "alone", "no one", "nobody" and "mad". Each scored 0.50 against the 0.4
// threshold on ordinary sentences, and "content" inverted an upset entry into
// contentment. Same remedy as R17: framed forms only, no matcher change.
describe("R18: six more bare words are not read as feelings", () => {
  describe("A. false positives that must not fire", () => {
    const noEmotion = [
      "I watched some content on my phone before bed",
      "the content of the email upset me",
      "content strategy is my whole job",
      "the loss of the contract set the whole team back",
      "we had a net loss this quarter",
      "hearing loss runs in my family",
      "it was a tough loss for the team last night",
      "I worked alone on the deck today and it was great",
      "that alone was worth the trip",
      "I like being alone with a book",
      "no one had to remind me, I just did it",
      "nobody was hurt in the crash",
      "I made a mad dash for the train",
      "she is mad about gardening",
      "it was mad busy at work",
    ];

    for (const text of noEmotion) {
      it(`detects nothing in: ${text}`, () => {
        expect(getTopEmotion(text, 0.4)).toBeNull();
      });
    }
  });

  describe("B. true positives that must keep firing", () => {
    const stillFires: [string, string, string][] = [
      ["I felt content after dinner", "content", "felt content"],
      ["the loss of my grandmother still hits me", "sad", "loss of my"],
      [
        "I keep feeling the loss of her in the small moments",
        "sad",
        "the loss of her",
      ],
      ["I feel alone even in a full room", "lonely", "feel alone"],
      ["sitting here all alone again", "lonely", "all alone"],
      [
        "there is no one to talk to about any of this",
        "lonely",
        "no one to talk to",
      ],
      ["I am so mad at myself for forgetting", "angry", "mad at"],
    ];

    for (const [text, emotion, keyword] of stillFires) {
      it(`still reports ${emotion} via "${keyword}" for: ${text}`, () => {
        const result = getTopEmotion(text, 0.4);
        expect(result).not.toBeNull();
        expect(result!.emotion).toBe(emotion);
        expect(result!.matchedKeywords).toContain(keyword);
      });
    }

    // Recall the bare-word list never had: "feeling low" shipped alone, so
    // these two inflections returned null before R18.
    const newlyCaught: [string, string][] = [
      ["I feel low today", "feel low"],
      ["I felt low all afternoon", "felt low"],
    ];

    for (const [text, keyword] of newlyCaught) {
      it(`now reports sad via "${keyword}" for: ${text}`, () => {
        const result = getTopEmotion(text, 0.4);
        expect(result).not.toBeNull();
        expect(result!.emotion).toBe("sad");
        expect(result!.matchedKeywords).toContain(keyword);
      });
    }
  });
});
