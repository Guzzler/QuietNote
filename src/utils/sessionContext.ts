import { extractThemes } from "./themeExtractor";
import { analyzeMoodTrend, findTopEmotions } from "./moodPatterns";
import type { Session, MoodEntry } from "../types";

export interface SessionContext {
  recentThemes: string[];
  recentEmotions: string[];
  lastSessionSummary: string;
  journalDays: number;
  moodTrend: "improving" | "stable" | "declining" | null;
}

function uniqueDays(sessions: Session[]): number {
  const days = new Set(
    sessions.map((s) => new Date(s.createdAt).toDateString())
  );
  return days.size;
}

function firstUserMessage(session: Session): string | null {
  for (const thread of session.threads) {
    for (const msg of thread.messages) {
      if (msg.role === "user" && msg.content.trim()) return msg.content;
    }
  }
  return null;
}

function allUserText(session: Session): string {
  return session.threads
    .flatMap((t) => t.messages)
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
}

export function buildSessionContext(
  sessions: Session[],
  moods: MoodEntry[],
  currentSessionId?: string
): SessionContext {
  const others = sessions.filter((s) => s.id !== currentSessionId);
  const sorted = [...others].sort((a, b) => b.createdAt - a.createdAt);
  const recent = sorted.slice(0, 3);

  const combinedText = recent.map(allUserText).join(" ");
  const themes = extractThemes(combinedText);
  const recentThemes = themes.slice(0, 3).map((t) => t.theme);

  const recentEmotions =
    moods.length >= 2
      ? findTopEmotions(moods, 2).map((e) => e.emotion)
      : [];

  let lastSessionSummary = "";
  if (recent.length > 0) {
    const firstMsg = firstUserMessage(recent[0]);
    if (firstMsg) {
      const words = firstMsg.split(/\s+/).slice(0, 12).join(" ");
      const dayDiff = Math.floor(
        (Date.now() - recent[0].createdAt) / (1000 * 60 * 60 * 24)
      );
      const when =
        dayDiff === 0 ? "Earlier today" : dayDiff === 1 ? "Yesterday" : `${dayDiff} days ago`;
      lastSessionSummary = `${when}, they wrote about: "${words}${firstMsg.split(/\s+/).length > 12 ? "…" : ""}"`;
    }
  }

  const journalDays = uniqueDays(sessions);

  const moodTrend = moods.length >= 5 ? analyzeMoodTrend(moods) : null;

  return { recentThemes, recentEmotions, lastSessionSummary, journalDays, moodTrend };
}

export function formatContextForPrompt(ctx: SessionContext): string {
  if (ctx.journalDays === 0 && !ctx.lastSessionSummary) return "";

  const parts: string[] = [];

  if (ctx.journalDays > 0) {
    parts.push(
      `The user has been journaling for ${ctx.journalDays} day${ctx.journalDays > 1 ? "s" : ""}.`
    );
  }

  if (ctx.recentThemes.length > 0) {
    parts.push(
      `Recently they've been reflecting on ${ctx.recentThemes.join(" and ")}.`
    );
  }

  if (ctx.moodTrend) {
    const trendLabel =
      ctx.moodTrend === "improving"
        ? "improving"
        : ctx.moodTrend === "declining"
          ? "lower than usual"
          : "steady";
    parts.push(`Their mood has been ${trendLabel}.`);
  }

  if (ctx.lastSessionSummary) {
    parts.push(ctx.lastSessionSummary);
  }

  return parts.join(" ");
}
