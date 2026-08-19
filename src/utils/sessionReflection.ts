import { extractThemes } from "./themeExtractor";
import { extractEmotions } from "./emotionExtractor";
import type { MoodEmotion, PromptCategory, Session } from "../types";

// An emotion whose name is also a theme name: naming both stutters
// ("grateful feelings around gratitude"). grateful/gratitude is the only
// collision between MoodEmotion and PromptCategory.
const EMOTION_THEME_SYNONYMS: Partial<Record<MoodEmotion, PromptCategory>> = {
  grateful: "gratitude",
};

// Settled feelings aren't "worked through" — they're noticed.
const SETTLED_EMOTIONS: MoodEmotion[] = [
  "happy",
  "calm",
  "excited",
  "content",
  "grateful",
];

function allUserText(session: Session): string {
  return session.threads
    .flatMap((t) => t.messages)
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
}

export function generateReflection(session: Session): string {
  const text = allUserText(session);
  if (!text.trim()) return "";

  const themes = extractThemes(text).slice(0, 2);
  const emotions = extractEmotions(text);
  const topEmotion = emotions.length > 0 ? emotions[0] : null;

  const themeNames = themes.map((t) => t.theme);

  if (topEmotion) {
    const synonym = EMOTION_THEME_SYNONYMS[topEmotion.emotion];
    const theme =
      synonym !== undefined && synonym === themeNames[0]
        ? themeNames[1]
        : themeNames[0];
    if (theme) {
      const verb = SETTLED_EMOTIONS.includes(topEmotion.emotion)
        ? "Noticed"
        : "Worked through";
      return `${verb} ${topEmotion.emotion} feelings around ${theme}.`;
    }
    return `Sat with ${topEmotion.emotion} feelings.`;
  }
  if (themeNames.length > 0) {
    return `Reflected on ${themeNames.join(" and ")}.`;
  }

  const words = text.trim().split(/\s+/).slice(0, 10).join(" ");
  return words + (text.trim().split(/\s+/).length > 10 ? "…" : "");
}

export function shouldRegenerate(session: Session): boolean {
  const s = session as Session & { reflection?: string; reflectionUpdatedAt?: number };
  if (!s.reflection) return true;
  if (!s.reflectionUpdatedAt) return true;
  return s.reflectionUpdatedAt < session.updatedAt;
}
