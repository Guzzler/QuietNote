// F6 (2026-08-11) — the greeting and mode suggestion that ChatPanel's empty
// state shows, lifted out of the component so it can be tested against real
// hours and real mood arrays. It was previously an inline `useMemo` with a
// hand-copied duplicate in PersonalizedWelcome.test.ts; the duplicate could
// not have caught this change, which is the reason for the extraction.
//
// The finding it answers (field note
// docs/field-notes/2026-08-11-first-tester.md §B1): the only in-app surface
// that ever names Thought Record sat behind `moods.length >= 5`, so a
// first-time user could never see it — and at the hour T1 wrote, the slot was
// left empty anyway.
import type { MoodEntry } from "../types";
import type { WelcomeSuggestion } from "./welcomeEmptyState";
import { bandForHour, type TimeBand } from "./timeOfDay";

/** The zero-data suggestion for the hours that used to offer nothing at all. */
export const THOUGHT_RECORD_SUGGESTION: WelcomeSuggestion = {
  text: "Something on your mind? Try a thought record.",
  mode: "thoughtrecord",
};

// F7 — the greeting's four bands are now the shared `getTimeBand` bands.
// They were already these exact boundaries, so no hour changes its greeting;
// what changes is that the system prompt reads the same clock.
const GREETINGS: Record<TimeBand, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Hello",
};

export function buildGreeting(hour: number): string {
  return GREETINGS[bandForHour(hour)];
}

/**
 * The mode suggestion for the empty state, or null.
 *
 * Morning and evening keep their check-in nudges. Afternoon and late night —
 * the two bands that returned null for everyone, first-time users included —
 * now offer the thought record. The mood-based override is unchanged: two or
 * more anxious/frustrated/angry entries in the last five still win.
 */
export function buildWelcomeSuggestion(
  hour: number,
  moods: MoodEntry[]
): WelcomeSuggestion | null {
  const band = bandForHour(hour);
  let suggestion: WelcomeSuggestion =
    band === "morning"
      ? { text: "Start with a morning check-in?", mode: "checkin" }
      : band === "evening"
        ? { text: "Wind down with an evening reflection?", mode: "checkin" }
        : THOUGHT_RECORD_SUGGESTION;

  if (moods.length >= 5) {
    const recent = moods.slice(0, 5);
    const anxiousOrStressed = recent.filter(
      (m) => m.emotion === "anxious" || m.emotion === "frustrated" || m.emotion === "angry"
    );
    if (anxiousOrStressed.length >= 2) {
      suggestion = { text: "Feeling overwhelmed? Try a thought record.", mode: "thoughtrecord" };
    }
  }

  return suggestion;
}
