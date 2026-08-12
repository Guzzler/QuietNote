export type TimeBucket = "morning" | "afternoon" | "evening" | "night";

/**
 * The prompt-library bucket (pre-existing, unchanged by F7).
 *
 * NOTE the boundary difference from `bandForHour` below: this one runs
 * evening to **22:00**. It selects which journal prompts are offered, which
 * is a different question from which check-in the model is asked to run, and
 * changing it would change the prompt library's behaviour for no reason the
 * first tester reported. Left alone deliberately — see F7 in
 * docs/initiatives/human-feedback.md.
 */
export function currentTimeBucket(now: Date = new Date()): TimeBucket {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

// F7 (2026-08-11) — the app carried two disagreeing clocks on the writing
// path.
//
// `ChatPanel`'s greeting had four bands (morning 5–12, afternoon 12–17,
// evening 17–21, else "Hello"), while `systemPrompts.isMorning()` had two —
// so after midnight the greeting was correctly neutral while the system
// prompt was confidently "Evening" and asked how the user's *day* went, about
// a day that had ended 35 minutes earlier. That is what the first tester hit
// (field note docs/field-notes/2026-08-11-first-tester.md §A3).
//
// One helper, four bands, used by both. The boundaries are the greeting's
// existing ones, unchanged, so no hour changes its greeting.

export type TimeBand = "morning" | "afternoon" | "evening" | "night";

/**
 * The time band for a moment. Boundaries: morning 05:00–11:59, afternoon
 * 12:00–16:59, evening 17:00–20:59, night 21:00–04:59.
 *
 * Takes the clock as an argument so it can be tested at every hour rather
 * than only at whatever hour the suite happens to run.
 */
export function getTimeBand(now: Date = new Date()): TimeBand {
  return bandForHour(now.getHours());
}

/** The band for a 0–23 hour. Split out so callers that already hold an hour
 *  (the welcome greeting) read the same boundaries as the system prompt. */
export function bandForHour(hour: number): TimeBand {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
