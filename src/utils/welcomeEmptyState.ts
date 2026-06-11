import type { ContinuityPrompt } from "./continuityPrompt";
import type { JournalingMode } from "../components/JournalingModeSelector";

// The single writing invitation shown under the greeting — an invitation to
// write, never a feature description (no privacy, mood, or streak copy).
export const INVITATION_TEXT = "Just start writing — whatever's on your mind.";

export const PROMPT_LINK_TEXT = "or try a journal prompt";

export interface WelcomeSuggestion {
  text: string;
  mode: JournalingMode;
}

export type AuxiliaryElement = "continuity" | "suggestion" | "none";

// The empty state shows at most ONE auxiliary element below the invitation.
// Continuity ("pick up where you left off") wins over a mode suggestion.
export function pickAuxiliaryElement(
  continuityPrompt: ContinuityPrompt | null,
  suggestion: WelcomeSuggestion | null
): AuxiliaryElement {
  if (continuityPrompt) return "continuity";
  if (suggestion) return "suggestion";
  return "none";
}
