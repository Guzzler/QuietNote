import type { JournalingMode } from "../components/JournalingModeSelector";

/**
 * The user-facing name of each journaling mode — one source of truth for copy
 * that names a mode outside the selector itself (F5's mode-switch notice).
 * Lives here rather than in the component so the constant can be imported
 * without tripping react-refresh's component-only-exports rule.
 */
export const MODE_LABELS: Record<JournalingMode, string> = {
  freewrite: "Free Write",
  gratitude: "Gratitude",
  checkin: "Check-in",
  thoughtrecord: "Thought Record",
};
