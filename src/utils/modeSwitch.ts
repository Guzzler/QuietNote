// F5 (2026-08-11) — switching journaling mode mid-session used to leave the
// session untouched, which is four coupled bugs at once (field note
// docs/field-notes/2026-08-11-first-tester.md §A2 + addendum):
//   1. the new mode's system prompt is sent over the old mode's transcript,
//   2. the session's stored `mode` still says the old mode, so a reload
//      silently reverts the switch,
//   3. the derived guided step counts user messages session-wide, so a
//      3-turn gratitude entry lands a Check-in on "Complete", and
//   4. worst — a switch to Thought Record after 5+ turns written in another
//      mode persists a *fabricated* ThoughtRecord to IndexedDB before the
//      user types anything.
//
// The rule: a mode is a distinct exercise, so switching modes on a session
// that already has content starts a new entry. The outgoing session is
// already persisted, so nothing is lost — it stays in the Sessions list.
import type { Session } from "../types";
import type { JournalingMode } from "../components/JournalingModeSelector";
import { deriveGuidedStep } from "./guidedSession";

/**
 * Should changing the journaling mode start a fresh entry?
 *
 * Only when there is a session with content to leave behind. On the empty
 * state `current` is null, so the welcome card's mode suggestion
 * (`ChatPanel.tsx` → `onSuggestMode`) keeps its existing behaviour: it just
 * selects a mode.
 */
export function shouldStartNewSessionOnModeChange(
  current: Session | null | undefined,
  currentMode: JournalingMode,
  nextMode: JournalingMode
): boolean {
  return !!current && nextMode !== currentMode;
}

/**
 * The guard on persisting a structured ThoughtRecord (App.tsx's save effect).
 *
 * `startedNewSession` above is what actually disarms defect 4 — clearing
 * `current` drops the derived step back to 1. This predicate is the second
 * line: it also refuses to file a record whose messages were written in a
 * *different* mode. Sessions written before R9 carry no `mode` at all; those
 * keep their old behaviour rather than losing an in-flight record.
 */
export function shouldPersistThoughtRecord(args: {
  mode: JournalingMode;
  session: Session | null | undefined;
  savedSessionId: string | null;
}): boolean {
  const { mode, session, savedSessionId } = args;
  if (mode !== "thoughtrecord") return false;
  if (!session) return false;
  if (savedSessionId === session.id) return false;
  if (session.mode !== undefined && session.mode !== "thoughtrecord") return false;
  return deriveGuidedStep(session) > 5;
}
