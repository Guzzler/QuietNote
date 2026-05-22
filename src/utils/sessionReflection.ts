import { extractThemes } from "./themeExtractor";
import { extractEmotions } from "./emotionExtractor";
import type { Session } from "../types";

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

  if (themeNames.length > 0 && topEmotion) {
    return `Worked through ${topEmotion.emotion} feelings around ${themeNames[0]}.`;
  }
  if (themeNames.length > 0) {
    return `Reflected on ${themeNames.join(" and ")}.`;
  }
  if (topEmotion) {
    return `Sat with ${topEmotion.emotion} feelings.`;
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
