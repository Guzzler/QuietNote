/**
 * Mood Pattern Analysis Utility
 * Analyzes logged mood entries to surface trends, correlations, and frequency patterns.
 * All functions are pure — accept mood arrays, return analysis. No side effects.
 *
 * Important: All descriptions use observational language ("You logged..."),
 * never diagnostic language ("You have..."). This is a mental health app —
 * patterns are observations, not clinical assessments.
 */

import type {
  MoodEntry,
  MoodEmotion,
  MoodContext,
  MoodPattern,
  WellnessReport,
} from "../types";

/** Minimum entries required before generating any patterns */
export const MIN_ENTRIES_FOR_PATTERNS = 5;

/** Minimum co-occurrences required before reporting a correlation */
export const MIN_COOCCURRENCES = 3;

/** Emotions considered "negative" for trend analysis */
const NEGATIVE_EMOTIONS: MoodEmotion[] = [
  "sad",
  "anxious",
  "angry",
  "frustrated",
  "lonely",
];

/**
 * Analyze whether moods are improving, stable, or declining over a period.
 * Compares average intensity of negative emotions in the first half vs second half.
 * Returns "stable" if insufficient data or no negative emotions.
 */
export function analyzeMoodTrend(
  moods: MoodEntry[]
): "improving" | "stable" | "declining" {
  if (moods.length < MIN_ENTRIES_FOR_PATTERNS) return "stable";

  // Sort by timestamp ascending
  const sorted = [...moods].sort((a, b) => a.ts - b.ts);
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgNegativeIntensity = (entries: MoodEntry[]): number => {
    const negativeEntries = entries.filter((e) =>
      NEGATIVE_EMOTIONS.includes(e.emotion)
    );
    if (negativeEntries.length === 0) return 0;
    return (
      negativeEntries.reduce((sum, e) => sum + e.intensity, 0) /
      negativeEntries.length
    );
  };

  const firstAvg = avgNegativeIntensity(firstHalf);
  const secondAvg = avgNegativeIntensity(secondHalf);
  const diff = secondAvg - firstAvg;

  // Threshold of 1.0 intensity points to avoid noise
  if (diff > 1.0) return "declining";
  if (diff < -1.0) return "improving";
  return "stable";
}

/**
 * Find the most frequently logged emotions, sorted by count descending.
 */
export function findTopEmotions(
  moods: MoodEntry[],
  limit: number = 3
): { emotion: MoodEmotion; count: number }[] {
  if (moods.length === 0) return [];

  const counts = new Map<MoodEmotion, number>();
  for (const mood of moods) {
    counts.set(mood.emotion, (counts.get(mood.emotion) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Find the most frequently logged contexts, sorted by count descending.
 */
export function findTopContexts(
  moods: MoodEntry[],
  limit: number = 3
): { context: MoodContext; count: number }[] {
  if (moods.length === 0) return [];

  const counts = new Map<MoodContext, number>();
  for (const mood of moods) {
    for (const ctx of mood.contexts) {
      counts.set(ctx, (counts.get(ctx) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([context, count]) => ({ context, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Detect emotion-context correlations that co-occur frequently.
 * Only reports correlations with at least MIN_COOCCURRENCES instances.
 * Uses observational language in descriptions.
 */
export function detectCorrelations(moods: MoodEntry[]): MoodPattern[] {
  if (moods.length < MIN_ENTRIES_FOR_PATTERNS) return [];

  // Count (emotion, context) co-occurrences
  const pairCounts = new Map<string, number>();
  const pairData = new Map<
    string,
    { emotion: MoodEmotion; context: MoodContext }
  >();

  for (const mood of moods) {
    for (const ctx of mood.contexts) {
      const key = `${mood.emotion}:${ctx}`;
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      if (!pairData.has(key)) {
        pairData.set(key, { emotion: mood.emotion, context: ctx });
      }
    }
  }

  const patterns: MoodPattern[] = [];
  for (const [key, count] of pairCounts) {
    if (count >= MIN_COOCCURRENCES) {
      const { emotion, context } = pairData.get(key)!;
      const confidence = Math.min(count / moods.length, 1.0);

      patterns.push({
        type: "correlation",
        description: `You logged "${emotion}" in "${context}" contexts ${count} times`,
        confidence,
        data: { emotion, context },
      });
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect day-of-week patterns in mood logging.
 */
export function detectDayOfWeekPatterns(moods: MoodEntry[]): MoodPattern[] {
  if (moods.length < MIN_ENTRIES_FOR_PATTERNS) return [];

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayCounts = new Map<string, { emotions: MoodEmotion[]; count: number }>();

  for (const mood of moods) {
    const day = dayNames[new Date(mood.ts).getDay()];
    const existing = dayCounts.get(day) ?? { emotions: [], count: 0 };
    existing.emotions.push(mood.emotion);
    existing.count++;
    dayCounts.set(day, existing);
  }

  const patterns: MoodPattern[] = [];
  for (const [day, data] of dayCounts) {
    if (data.count >= MIN_COOCCURRENCES) {
      // Find the dominant emotion for this day
      const emotionCounts = new Map<MoodEmotion, number>();
      for (const e of data.emotions) {
        emotionCounts.set(e, (emotionCounts.get(e) ?? 0) + 1);
      }
      const topEmotion = Array.from(emotionCounts.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0];

      if (topEmotion && topEmotion[1] >= 2) {
        patterns.push({
          type: "trend",
          description: `You often log "${topEmotion[0]}" on ${day}s (${topEmotion[1]} times)`,
          confidence: topEmotion[1] / data.count,
          data: { emotion: topEmotion[0], dayOfWeek: day },
        });
      }
    }
  }

  return patterns;
}

/**
 * Generate a comprehensive wellness report from mood entries.
 * Requires at least MIN_ENTRIES_FOR_PATTERNS entries.
 * Returns a report with safe defaults if data is insufficient.
 */
export function generateWeeklyReport(
  moods: MoodEntry[],
  periodStart?: number,
  periodEnd?: number
): WellnessReport {
  const now = Date.now();
  const start = periodStart ?? (moods.length > 0 ? Math.min(...moods.map((m) => m.ts)) : now);
  const end = periodEnd ?? now;

  const moodAverage =
    moods.length > 0
      ? moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length
      : 0;

  const trend = analyzeMoodTrend(moods);
  const topEmotions = findTopEmotions(moods, 5);
  const topContexts = findTopContexts(moods, 5);

  const patterns: MoodPattern[] = [
    ...detectCorrelations(moods),
    ...detectDayOfWeekPatterns(moods),
  ];

  // Generate observational insights (never diagnostic language)
  const insights: string[] = [];

  if (moods.length < MIN_ENTRIES_FOR_PATTERNS) {
    insights.push(
      `You've logged ${moods.length} mood ${moods.length === 1 ? "entry" : "entries"}. Log at least ${MIN_ENTRIES_FOR_PATTERNS} to see patterns.`
    );
  } else {
    if (topEmotions.length > 0) {
      insights.push(
        `Your most frequently logged emotion was "${topEmotions[0].emotion}" (${topEmotions[0].count} times).`
      );
    }

    if (trend === "improving") {
      insights.push(
        "Your recent mood logs show a positive shift compared to earlier in this period."
      );
    } else if (trend === "declining") {
      insights.push(
        "Your recent mood logs show more intensity in difficult emotions compared to earlier. Remember, support is always available."
      );
    }

    if (patterns.length > 0) {
      insights.push(
        `${patterns.length} pattern${patterns.length === 1 ? " was" : "s were"} detected in your mood logs.`
      );
    }
  }

  return {
    id: `report-${start}-${end}`,
    periodStart: start,
    periodEnd: end,
    moodAverage: Math.round(moodAverage * 10) / 10,
    moodTrend: trend,
    patterns,
    journalCount: 0, // Not tracked by mood entries alone
    thoughtRecordCount: 0, // Not tracked by mood entries alone
    topEmotions,
    topContexts,
    insights,
    generatedAt: now,
  };
}
