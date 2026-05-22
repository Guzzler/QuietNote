import { buildSessionContext } from "./sessionContext";
import { extractThemes } from "./themeExtractor";
import type { Session, MoodEntry } from "../types";

export interface ContinuityPrompt {
  headline: string;
  body: string;
  suggestedInput: string;
  kind: "last-session" | "recurring-theme" | "mood-followup";
}

function extractShortTopic(session: Session): string | null {
  for (const thread of session.threads) {
    for (const msg of thread.messages) {
      if (msg.role === "user" && msg.content.trim()) {
        const words = msg.content.trim().split(/\s+/).slice(0, 8);
        return words.join(" ") + (msg.content.trim().split(/\s+/).length > 8 ? "…" : "");
      }
    }
  }
  return null;
}

function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

function formatWhen(days: number): string {
  if (days === 0) return "Earlier today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function findRecurringTheme(sessions: Session[]): string | null {
  const themeCounts = new Map<string, number>();
  for (const session of sessions.slice(0, 5)) {
    const text = session.threads
      .flatMap((t) => t.messages)
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    const themes = extractThemes(text);
    const seen = new Set<string>();
    for (const t of themes) {
      if (!seen.has(t.theme)) {
        seen.add(t.theme);
        themeCounts.set(t.theme, (themeCounts.get(t.theme) || 0) + 1);
      }
    }
  }

  for (const [theme, count] of themeCounts) {
    if (count >= 2) return theme;
  }
  return null;
}

export function buildContinuityPrompt(
  sessions: Session[],
  moods: MoodEntry[],
  currentSessionId?: string
): ContinuityPrompt | null {
  const others = sessions.filter((s) => s.id !== currentSessionId);
  if (others.length === 0) return null;

  const sorted = [...others].sort((a, b) => b.createdAt - a.createdAt);
  const latest = sorted[0];
  const days = daysSince(latest.createdAt);

  if (days <= 7) {
    const shortTopic = extractShortTopic(latest);
    if (shortTopic) {
      return {
        kind: "last-session",
        headline: "Pick up where you left off",
        body: `${formatWhen(days)}, you wrote about ${shortTopic}. How are you feeling about that today?`,
        suggestedInput: `I want to revisit what I wrote about ${shortTopic}. `,
      };
    }
  }

  const recurring = findRecurringTheme(sorted);
  if (recurring) {
    return {
      kind: "recurring-theme",
      headline: "A recurring thread",
      body: `You've been reflecting on ${recurring} across recent sessions. Want to go deeper?`,
      suggestedInput: `I want to think more about ${recurring}. `,
    };
  }

  const ctx = buildSessionContext(sessions, moods, currentSessionId);
  if (ctx.moodTrend === "declining") {
    return {
      kind: "mood-followup",
      headline: "Checking in",
      body: "Your mood has been lower lately. Sometimes writing about what's weighing on you can help.",
      suggestedInput: "I've been feeling down lately and want to explore why. ",
    };
  }
  if (ctx.moodTrend === "improving") {
    return {
      kind: "mood-followup",
      headline: "Things are looking up",
      body: "Your mood has been improving. What do you think has been helping?",
      suggestedInput: "I've been feeling better lately. I think it's because ",
    };
  }

  return null;
}
