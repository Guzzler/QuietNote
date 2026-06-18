import type { MoodEmotion } from "../types";

// Solid dot colors (Tailwind bg-* class strings), keyed by emotion. Used by the
// small mood swatch in the Sessions index. This is a separate, solid-swatch
// variant from the soft bg-*-100/text-*-700 chips in MoodHistoryPanel — those
// stay as-is.
export const EMOTION_DOT: Record<MoodEmotion, string> = {
  happy: "bg-yellow-400",
  sad: "bg-blue-400",
  anxious: "bg-purple-400",
  angry: "bg-red-400",
  calm: "bg-teal-400",
  excited: "bg-orange-400",
  frustrated: "bg-amber-400",
  content: "bg-pink-400",
  lonely: "bg-slate-400",
  grateful: "bg-green-400",
};

export const EMOTION_LABEL: Record<MoodEmotion, string> = {
  happy: "Happy",
  sad: "Sad",
  anxious: "Anxious",
  angry: "Angry",
  calm: "Calm",
  excited: "Excited",
  frustrated: "Frustrated",
  content: "Content",
  lonely: "Lonely",
  grateful: "Grateful",
};
