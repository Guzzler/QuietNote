import type { MoodEmotion, MoodEntry } from "../types";

// A one-tap "quick capture" mood log from the inline "How are you feeling?"
// row at the free-write entry start. It is a fully valid MoodEntry — just a
// lighter one: a neutral intensity, no contexts, no note. The full MoodTracker
// ("add detail") refines it. sessionId is included only when a session exists,
// matching the header-capture behaviour (which also logs unlinked moods).
//
// intensity 5 is the neutral midpoint of the 1–10 scale: an un-graded quick log
// asserts "I feel X" without claiming how strongly.
export function makeQuickMoodEntry(
  emotion: MoodEmotion,
  sessionId?: string
): MoodEntry {
  return {
    id: crypto.randomUUID(),
    emotion,
    intensity: 5,
    contexts: [],
    ts: Date.now(),
    ...(sessionId ? { sessionId } : {}),
  };
}
