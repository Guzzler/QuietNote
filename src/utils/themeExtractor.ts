/**
 * Theme Extraction Utility
 * Client-side keyword/pattern-based detection of conversation themes.
 * Used to suggest relevant journaling prompts from the curated database.
 * Follows the same pattern as emotionExtractor.ts — pure functions, no side effects.
 */

import type { PromptCategory } from "../types";

export interface ThemeMatch {
  theme: PromptCategory;
  confidence: number; // 0-1
  matchedKeywords: string[];
}

// Keyword maps for each theme category
const THEME_KEYWORDS: Record<PromptCategory, string[]> = {
  gratitude: [
    "grateful",
    "thankful",
    "appreciate",
    "blessed",
    "fortunate",
    "lucky",
    "counting my blessings",
    "good things",
    "bright side",
    "silver lining",
    "gift",
    "privilege",
  ],
  "self-reflection": [
    "thinking about myself",
    "who am i",
    "identity",
    "values",
    "what matters",
    "self-aware",
    "introspect",
    "patterns",
    "realize",
    "realization",
    "understand myself",
    "figuring out",
    "soul searching",
    "what i believe",
    "sense of self",
  ],
  goals: [
    "goal",
    "goals",
    "ambition",
    "plan",
    "planning",
    "want to achieve",
    "dream",
    "aspire",
    "aspiration",
    "future",
    "next step",
    "career",
    "improve",
    "improvement",
    "habit",
    "routine",
    "discipline",
    "milestone",
    "progress",
    "succeed",
    "success",
  ],
  challenges: [
    "challenge",
    "difficult",
    "struggle",
    "struggling",
    "hard time",
    "tough",
    "problem",
    "obstacle",
    "setback",
    "overwhelmed",
    "burden",
    "weight",
    "weighing on",
    "can't cope",
    "falling apart",
    "breaking down",
    "under pressure",
    "stressed",
    "burnout",
    "exhausted",
  ],
  relationships: [
    "friend",
    "friends",
    "partner",
    "spouse",
    "husband",
    "wife",
    "boyfriend",
    "girlfriend",
    "family",
    "mom",
    "dad",
    "mother",
    "father",
    "brother",
    "sister",
    "colleague",
    "coworker",
    "boss",
    "relationship",
    "argument",
    "fight",
    "conflict",
    "connection",
    "lonely",
    "love",
    "trust",
    "betrayal",
    "breakup",
    "divorce",
    "dating",
  ],
  growth: [
    "learn",
    "learning",
    "lesson",
    "grow",
    "growing",
    "growth",
    "change",
    "changing",
    "evolve",
    "transform",
    "new perspective",
    "comfort zone",
    "mistake",
    "failure",
    "feedback",
    "better version",
    "personal development",
    "self improvement",
    "overcome",
  ],
  creativity: [
    "create",
    "creative",
    "creativity",
    "imagine",
    "imagination",
    "art",
    "write",
    "writing",
    "music",
    "paint",
    "painting",
    "design",
    "build",
    "project",
    "idea",
    "inspiration",
    "inspired",
    "express",
    "expression",
    "craft",
  ],
};

/**
 * Extract themes from text using keyword matching.
 * Returns themes sorted by confidence (highest first).
 */
export function extractThemes(text: string): ThemeMatch[] {
  if (!text || text.trim().length === 0) return [];

  const lowerText = text.toLowerCase();
  const results: ThemeMatch[] = [];

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS) as [
    PromptCategory,
    string[],
  ][]) {
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, "i");
      if (regex.test(lowerText)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      // Confidence based on number of keyword matches
      // More matches = higher confidence
      const confidence = Math.min(1, matchedKeywords.length * 0.25 + 0.2);

      results.push({
        theme,
        confidence,
        matchedKeywords,
      });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

/**
 * Get the top theme from text, or null if none detected with sufficient confidence.
 */
export function getTopTheme(
  text: string,
  minConfidence: number = 0.4
): ThemeMatch | null {
  const themes = extractThemes(text);
  if (themes.length === 0) return null;
  if (themes[0].confidence < minConfidence) return null;
  return themes[0];
}
