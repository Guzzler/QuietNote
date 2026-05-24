import type { Session, MoodEntry, MoodEmotion } from "../types";
import { extractThemes } from "./themeExtractor";

export interface MoodJournalObservation {
  kind: "theme-emotion" | "best-mood-theme" | "worst-mood-theme" | "mode-impact";
  text: string;
  confidence: "high" | "medium" | "low";
}

const POSITIVE_EMOTIONS: MoodEmotion[] = ["happy", "calm", "excited", "content", "grateful"];

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function sameCalendarDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function getSessionText(session: Session): string {
  return session.threads
    .flatMap((t) => t.messages)
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
}

function findLinkedMoods(session: Session, moods: MoodEntry[]): MoodEntry[] {
  const linked: MoodEntry[] = [];
  const seen = new Set<string>();

  for (const mood of moods) {
    if (seen.has(mood.id)) continue;

    if (mood.sessionId === session.id) {
      linked.push(mood);
      seen.add(mood.id);
      continue;
    }

    if (
      sameCalendarDay(mood.ts, session.updatedAt) &&
      Math.abs(mood.ts - session.updatedAt) <= TWO_HOURS_MS
    ) {
      linked.push(mood);
      seen.add(mood.id);
    }
  }

  return linked;
}

function confidenceFromCount(n: number): "high" | "medium" | "low" {
  if (n >= 8) return "high";
  if (n >= 5) return "medium";
  return "low";
}

function emotionValence(emotion: MoodEmotion): number {
  return POSITIVE_EMOTIONS.includes(emotion) ? 1 : -1;
}

export function buildCorrelations(
  sessions: Session[],
  moods: MoodEntry[],
  now: number = Date.now()
): MoodJournalObservation[] {
  if (sessions.length === 0 || moods.length === 0) return [];

  const cutoff = now - SIXTY_DAYS_MS;
  const recentSessions = sessions.filter((s) => s.updatedAt >= cutoff);
  const recentMoods = moods.filter((m) => m.ts >= cutoff);

  if (recentSessions.length === 0 || recentMoods.length === 0) return [];

  const themeMoods = new Map<string, MoodEntry[]>();
  const themeSessions = new Map<string, number>();

  for (const session of recentSessions) {
    const text = getSessionText(session);
    if (text.trim().length === 0) continue;

    const themes = extractThemes(text);
    const linked = findLinkedMoods(session, recentMoods);
    if (linked.length === 0) continue;

    for (const themeMatch of themes) {
      const theme = themeMatch.theme;
      const existing = themeMoods.get(theme) ?? [];
      existing.push(...linked);
      themeMoods.set(theme, existing);
      themeSessions.set(theme, (themeSessions.get(theme) ?? 0) + 1);
    }
  }

  const observations: MoodJournalObservation[] = [];

  // Theme-emotion correlations
  for (const [theme, moodEntries] of themeMoods) {
    const sessionCount = themeSessions.get(theme) ?? 0;
    if (sessionCount < 3) continue;

    const emotionCounts = new Map<MoodEmotion, number>();
    for (const m of moodEntries) {
      emotionCounts.set(m.emotion, (emotionCounts.get(m.emotion) ?? 0) + 1);
    }

    let dominantEmotion: MoodEmotion | null = null;
    let maxCount = 0;
    for (const [emotion, count] of emotionCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    if (dominantEmotion && maxCount / moodEntries.length >= 0.6) {
      observations.push({
        kind: "theme-emotion",
        text: `You tend to feel ${dominantEmotion} when writing about ${theme} (${maxCount} of ${sessionCount} sessions)`,
        confidence: confidenceFromCount(sessionCount),
      });
    }
  }

  // Best and worst mood themes
  const themeScores: { theme: string; avgScore: number; count: number }[] = [];
  for (const [theme, moodEntries] of themeMoods) {
    const sessionCount = themeSessions.get(theme) ?? 0;
    if (sessionCount < 3) continue;

    const score =
      moodEntries.reduce(
        (sum, m) => sum + emotionValence(m.emotion) * m.intensity,
        0
      ) / moodEntries.length;

    themeScores.push({ theme, avgScore: score, count: sessionCount });
  }

  if (themeScores.length >= 2) {
    themeScores.sort((a, b) => b.avgScore - a.avgScore);
    const best = themeScores[0];
    observations.push({
      kind: "best-mood-theme",
      text: `Sessions about ${best.theme} correlate with your highest mood ratings`,
      confidence: confidenceFromCount(best.count),
    });

    const worst = themeScores[themeScores.length - 1];
    if (worst.avgScore <= 4) {
      observations.push({
        kind: "worst-mood-theme",
        text: `Writing about ${worst.theme} tends to come with lower mood`,
        confidence: confidenceFromCount(worst.count),
      });
    }
  }

  // Filter: drop low-confidence if high or medium exist
  const hasHighOrMedium = observations.some(
    (o) => o.confidence === "high" || o.confidence === "medium"
  );
  const filtered = hasHighOrMedium
    ? observations.filter((o) => o.confidence !== "low")
    : observations;

  // Sort by confidence (high first), then cap at 4
  const confOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => confOrder[a.confidence] - confOrder[b.confidence]);

  return filtered.slice(0, 4);
}
