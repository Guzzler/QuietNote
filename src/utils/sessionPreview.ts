import type { Session, MoodEntry, MoodEmotion } from "../types";

/** First user message of a session, whitespace-collapsed, or "" if none. */
export function firstUserMessage(s: Session): string {
  const msg = s.threads[0]?.messages?.find((m) => m.role === "user");
  if (!msg) return "";
  return msg.content.replace(/\s+/g, " ").trim();
}

/**
 * The mood that best represents a session, or null.
 *   1) prefer moods with mood.sessionId === s.id (most recent by ts)
 *   2) else the mood whose ts ∈ [s.createdAt, s.updatedAt] (most recent)
 *   3) else null — never guess from unrelated moods.
 */
export function pickSessionMood(
  s: Session,
  moods: MoodEntry[]
): MoodEmotion | null {
  let linked: MoodEntry | null = null;
  let windowed: MoodEntry | null = null;

  for (const m of moods) {
    if (m.sessionId === s.id) {
      if (!linked || m.ts > linked.ts) linked = m;
    } else if (m.ts >= s.createdAt && m.ts <= s.updatedAt) {
      if (!windowed || m.ts > windowed.ts) windowed = m;
    }
  }

  if (linked) return linked.emotion;
  if (windowed) return windowed.emotion;
  return null;
}
