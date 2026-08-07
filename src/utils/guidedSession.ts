// R9 (2026-08-06) — guided sessions must survive a reload.
//
// The guided-mode step used to live in three `useState` counters in App.tsx,
// which meant a reload reset them to 1 and a mid-exercise Thought Record could
// never reach its save condition (silent data loss). The step is now *derived*
// from the stored transcript instead of tracked alongside it: a derived step
// cannot drift from the messages, and a resumed session lands on the step it
// actually reached.
import type { Session } from "../types";
import type { JournalingMode } from "../components/JournalingModeSelector";

/** Number of user messages stored across every thread of a session. */
export function countUserMessages(session: Session | null | undefined): number {
  if (!session) return 0;
  return session.threads
    .flatMap((t) => t.messages)
    .filter((m) => m.role === "user").length;
}

/**
 * The 1-based guided step for a session: one step per user message already
 * sent, plus one for the step being written now. An empty/absent session is
 * step 1, which is what the guides showed before any entry.
 */
export function deriveGuidedStep(session: Session | null | undefined): number {
  return countUserMessages(session) + 1;
}

/**
 * The journaling mode a session was written in. Sessions created before R9
 * carry no `mode` field; they are free writes, so no migration is needed.
 */
export function resolveSessionMode(session: Session | null | undefined): JournalingMode {
  return session?.mode ?? "freewrite";
}
