/**
 * Emotion Extraction Utility
 * Client-side keyword/pattern-based detection of emotions in conversation text.
 * Follows the same pattern as crisisDetection.ts — pure functions, no side effects.
 */

import type { MoodEmotion } from "../types";

export interface EmotionMatch {
  emotion: MoodEmotion;
  confidence: number; // 0-1
  intensity: number; // 1-10
  matchedKeywords: string[];
}

// Keyword maps for each emotion, ordered roughly by specificity
const EMOTION_KEYWORDS: Record<MoodEmotion, string[]> = {
  happy: [
    "happy",
    "joy",
    "joyful",
    "delighted",
    "cheerful",
    "glad",
    "pleased",
    "wonderful",
    "great day",
    "feeling good",
    "so good",
    "really good",
    "amazing",
    "fantastic",
    "thrilled",
    "elated",
    "blissful",
    "ecstatic",
  ],
  sad: [
    "sad",
    "sadness",
    "heartbroken",
    "sorrowful",
    "grief",
    "grieving",
    "mourning",
    // Framed only: a bare "loss" fires on "a net loss this quarter",
    // "hearing loss", "a tough loss for the team" (R18).
    "loss of my",
    "such a loss",
    "the loss of her",
    "the loss of him",
    "sense of loss",
    "feel the loss",
    "miss them",
    "miss her",
    "miss him",
    "crying",
    "cried",
    "tears",
    "broken hearted",
    "devastated",
    "melancholy",
    "gloomy",
    // Verb-framed only: a bare "down" fires on "sat down", "the server was
    // down", even "calmed down" — a false hit tells the user they felt
    // something they did not (R17).
    "feeling down",
    "feel down",
    "felt down",
    "feeling low",
    // The two inflections "feeling low" was missing all along (R18).
    "feel low",
    "felt low",
  ],
  anxious: [
    "anxious",
    "anxiety",
    "worried",
    "worrying",
    "nervous",
    "stressed",
    "stress",
    "tense",
    "on edge",
    "panic",
    "panicking",
    "panicked",
    "uneasy",
    "restless",
    "dread",
    "dreading",
    "apprehensive",
    "fear",
    "afraid",
    "scared",
    "frightened",
  ],
  angry: [
    "angry",
    "anger",
    "furious",
    "rage",
    "raging",
    // Framed only: a bare "mad" fires on "a mad dash", "mad about gardening",
    // "mad busy" (R18).
    "mad at",
    "so mad",
    "really mad",
    "mad about it",
    "get mad",
    "got mad",
    "irritated",
    "annoyed",
    "pissed",
    "livid",
    "fuming",
    "infuriated",
    "resentful",
    "resentment",
    "outraged",
    "hostile",
  ],
  calm: [
    "calm",
    "peaceful",
    "serene",
    "tranquil",
    "relaxed",
    "at peace",
    "centered",
    "grounded",
    // "still" removed (R17): in journal prose it is almost always the adverb
    // ("I still feel guilty"), and it has no first-person feeling frame worth
    // a replacement token.
    "settled",
    "composed",
    "mellow",
    "at ease",
  ],
  excited: [
    "excited",
    "excitement",
    "enthusiastic",
    "pumped",
    "stoked",
    "thrilled",
    "can't wait",
    "looking forward",
    "eager",
    "energized",
    "buzzing",
    "hyped",
  ],
  frustrated: [
    "frustrated",
    "frustration",
    "stuck",
    "fed up",
    "exasperated",
    "aggravated",
    "at my wits end",
    "hitting a wall",
    "going nowhere",
    "can't figure",
    "so annoying",
  ],
  content: [
    // Framed only: a bare "content" fires on "content strategy", "watched
    // some content", and inverts "the content of the email upset me" into
    // contentment (R18).
    "feel content",
    "feeling content",
    "felt content",
    "so content",
    "quite content",
    "satisfied",
    "comfortable",
    "at ease",
    "fulfilled",
    "appreciative",
    "things are good",
    "doing well",
    "in a good place",
    "steady",
  ],
  lonely: [
    "lonely",
    "loneliness",
    // Framed only: a bare "alone" fires on "that alone was worth it" and
    // "I worked alone on the deck"; bare "no one"/"nobody" fire on "nobody
    // was hurt in the crash" (R18).
    "feel alone",
    "feeling alone",
    "felt alone",
    "so alone",
    "all alone",
    "alone in this",
    "isolated",
    "no one to talk to",
    "no one understands",
    "no one cares",
    "nobody to talk to",
    "nobody understands",
    "nobody cares",
    "no one else",
    "disconnected",
    "left out",
    "forgotten",
    "abandoned",
    "on my own",
  ],
  grateful: [
    "grateful",
    "gratitude",
    "thankful",
    "blessed",
    "appreciative",
    "appreciate",
    "fortunate",
    "lucky",
    "counting my blessings",
    "so thankful",
  ],
};

// Intensity modifiers that increase or decrease the base intensity
const INTENSITY_AMPLIFIERS: { pattern: string; modifier: number }[] = [
  { pattern: "extremely", modifier: 3 },
  { pattern: "incredibly", modifier: 3 },
  { pattern: "so ", modifier: 2 },
  { pattern: "really ", modifier: 2 },
  { pattern: "very ", modifier: 2 },
  { pattern: "deeply ", modifier: 2 },
  { pattern: "quite ", modifier: 1 },
  { pattern: "pretty ", modifier: 1 },
  { pattern: "somewhat ", modifier: -1 },
  { pattern: "a little ", modifier: -2 },
  { pattern: "slightly ", modifier: -2 },
  { pattern: "a bit ", modifier: -1 },
  { pattern: "kind of ", modifier: -1 },
  { pattern: "sort of ", modifier: -1 },
];

/**
 * Estimate intensity of an emotion based on surrounding modifiers.
 * Base intensity is 5, adjusted by amplifiers found near the keyword.
 */
export function estimateIntensity(text: string, emotion: MoodEmotion): number {
  const lowerText = text.toLowerCase();
  const keywords = EMOTION_KEYWORDS[emotion];

  let maxModifier = 0;

  for (const keyword of keywords) {
    const keywordIndex = lowerText.indexOf(keyword.toLowerCase());
    if (keywordIndex === -1) continue;

    // Check for intensity modifiers in a window before the keyword
    const windowStart = Math.max(0, keywordIndex - 30);
    const window = lowerText.slice(windowStart, keywordIndex + keyword.length);

    for (const { pattern, modifier } of INTENSITY_AMPLIFIERS) {
      if (window.includes(pattern)) {
        if (Math.abs(modifier) > Math.abs(maxModifier)) {
          maxModifier = modifier;
        }
      }
    }
  }

  // Base intensity of 5, clamped to 1-10
  return Math.max(1, Math.min(10, 5 + maxModifier));
}

/**
 * Extract emotions from text using keyword matching.
 * Returns emotions sorted by confidence (highest first).
 */
export function extractEmotions(text: string): EmotionMatch[] {
  if (!text || text.trim().length === 0) return [];

  const lowerText = text.toLowerCase();
  const results: EmotionMatch[] = [];

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS) as [
    MoodEmotion,
    string[],
  ][]) {
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      // Use word boundary-aware matching to reduce false positives
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, "i");
      if (regex.test(lowerText)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      // Confidence based on number of keyword matches relative to total keywords
      // More matches = higher confidence, but cap reasonably
      const confidence = Math.min(
        1,
        matchedKeywords.length * 0.3 + 0.2
      );

      results.push({
        emotion,
        confidence,
        intensity: estimateIntensity(text, emotion),
        matchedKeywords,
      });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

/**
 * Get the top emotion from text, or null if none detected with sufficient confidence.
 */
export function getTopEmotion(
  text: string,
  minConfidence: number = 0.4
): EmotionMatch | null {
  const emotions = extractEmotions(text);
  if (emotions.length === 0) return null;
  if (emotions[0].confidence < minConfidence) return null;
  return emotions[0];
}
