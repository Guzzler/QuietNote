/**
 * Response shaping — deflection-shape re-prompt guard (mechanism B, Day 9).
 *
 * The Day-6-settled gratitude failure: on harm-intent prompts the model bails
 * with a resource-only brush-off ("Please reach out to a crisis line
 * immediately for support.") — no acknowledgement of the pain, no question.
 * The Day-9 carve-out rewrite (mechanism A) fixed the question and the
 * resource placement, but the residual failure shape still acknowledges only
 * abstractly ("intense feelings") without naming the pain.
 *
 * This guard detects both shapes deterministically and triggers ONE
 * re-generation with a user-side shaping instruction. The second response is
 * taken unconditionally (no loops). It runs BEFORE the safety layer
 * (responseGuardrails / crisisDetection), which still applies on whichever
 * response is used — this guard never weakens either.
 *
 * Predicate note: the 2026-06-09 plan specced isBareDeflection as
 * (resource keyword) AND (no "?") AND (no pain words). The mechanism-A
 * measurement showed the surviving failure HAS a "?" but still lacks the
 * pain acknowledgement, so the composition is adapted to
 * (resource keyword) AND (no "?" OR no pain words) — it would never fire on
 * the pre-rewrite bodies' fixed versions, and the resource-keyword gate keeps
 * it inert on ordinary (non-crisis-resource) turns.
 */

export interface ChatMessageLike {
  role: string;
  content: string;
}

// Crisis-resource signals (per the Day-9 plan spec). Substring,
// case-insensitive — mirrors the scorer's matching style.
const CRISIS_RESOURCE_SIGNALS = [
  "crisis line",
  "emergency services",
  "988",
  "reach out to someone",
];

// Pain-acknowledgement vocabulary — the same set the gratitude carveout
// instructs the model to use ("hurt", "anger", "pain", plus the carveout's
// "carrying"/"hear" framing words).
const PAIN_ACKNOWLEDGEMENT_SIGNALS = ["pain", "hurt", "anger", "carrying", "hear"];

/**
 * True when a response is a crisis-resource deflection that skips engaging
 * with the user's pain: it points at a resource AND is missing the question
 * or the pain acknowledgement (or both).
 */
export function isBareDeflection(response: string): boolean {
  const text = response.toLowerCase();
  if (!text.trim()) return false;

  const hasCrisisResource = CRISIS_RESOURCE_SIGNALS.some((s) => text.includes(s));
  if (!hasCrisisResource) return false;

  const hasQuestion = text.includes("?");
  const hasPainAcknowledgement = PAIN_ACKNOWLEDGEMENT_SIGNALS.some((s) =>
    text.includes(s)
  );
  return !hasQuestion || !hasPainAcknowledgement;
}

/**
 * The one-shot user-side shaping instruction appended on re-generation.
 * Shape-neutral: covers both the no-question bail and the
 * abstract-acknowledgement bail.
 */
export const DEFLECTION_REPROMPT_INSTRUCTION =
  "Your previous reply didn't acknowledge the pain behind my words. " +
  "Name the hurt, anger, or pain I'm carrying first — speak to what I actually said — " +
  "and end with one gentle question for me.";

/**
 * Returns a new messages array with the shaping instruction appended to the
 * final user turn (template-safe: no new turns added, role alternation
 * preserved — the Day-8 prepend-to-current-user pattern, appended instead).
 * If there is no user turn, the messages are returned unchanged.
 */
export function withDeflectionReprompt<T extends ChatMessageLike>(messages: T[]): T[] {
  const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
  if (lastUserIdx === -1) return messages;
  return messages.map((m, i) =>
    i === lastUserIdx
      ? { ...m, content: `${m.content}\n\n${DEFLECTION_REPROMPT_INSTRUCTION}` }
      : m
  );
}
