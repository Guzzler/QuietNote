// Global keyboard-shortcut resolution for Track A6 (focus mode + keyboard polish).
//
// The logic is split out as pure functions so the App-level keydown handler stays
// thin and the shortcut behaviour is unit-testable without rendering the whole
// model-loading App tree (mirrors the deterministic-guard style used across
// src/components/__tests__).

export type ShortcutAction =
  | "toggle-focus"
  | "new-session"
  | "open-prompt-picker"
  | null;

export interface ShortcutContext {
  /** True when any modal (crisis / mood / privacy / settings) is open. */
  modalOpen: boolean;
  /** The keydown event target — used to detect typing fields. */
  target: EventTarget | null;
}

/**
 * Returns true when the event target is a field where the user is typing text:
 * a <textarea>, <input>, or any [contenteditable] element. The main journal
 * writing surface is a <textarea>, so this guard is what keeps "/" a literal
 * slash inside the journal rather than a prompt-picker hijack.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  // Duck-type rather than `instanceof HTMLElement` so this is testable in a
  // plain Node test environment (no DOM globals) and robust across realms.
  const el = target as { tagName?: string; isContentEditable?: boolean };
  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";
  if (tag === "TEXTAREA" || tag === "INPUT") return true;
  if (el.isContentEditable === true) return true;
  return false;
}

/**
 * Maps a keydown event to a single high-level action. Pure: takes only the
 * event keys it needs plus the surrounding context, so it can be exercised
 * deterministically in jsdom.
 *
 * Precedence rules:
 *  - Cmd/Ctrl+N always means "new entry" (browser-reserved caveat handled by
 *    the caller via preventDefault — best-effort).
 *  - Escape toggles focus mode, BUT only when no modal is open; when a modal is
 *    open we return null so the modal's own Esc-to-close handler runs.
 *  - "/" opens the prompt picker, but never while typing in a field or while a
 *    modal is open.
 */
export function resolveShortcut(
  e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">,
  ctx: ShortcutContext
): ShortcutAction {
  // Cmd/Ctrl+N — new entry (takes precedence; the only modifier shortcut).
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
    return "new-session";
  }

  // Remaining shortcuts are unmodified single keys.
  if (e.metaKey || e.ctrlKey) return null;

  if (e.key === "Escape") {
    if (ctx.modalOpen) return null; // let the modal close itself
    return "toggle-focus";
  }

  if (e.key === "/") {
    if (ctx.modalOpen || isTypingTarget(ctx.target)) return null;
    return "open-prompt-picker";
  }

  return null;
}
