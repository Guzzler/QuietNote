# Day 21 — Track A6: Focus mode + keyboard polish

## Summary

Shipped the last accepted Track A item: a distraction-free **focus mode** plus
two keyboard shortcuts that remove the final mouse round-trips from the core
writing loop. This closes Problem #4 ("the app feels like a tech demo") — with
A6 done, **Track A is complete (A1–A6 all DONE)**.

- **`Esc`** toggles focus mode — the header, sessions sidebar, and footer recede
  (fade + collapse), leaving just the centered writing surface and a small
  "Press Esc to exit focus" hint. `Esc` again restores the chrome.
- **`Cmd/Ctrl+N`** starts a new entry.
- **`/`** opens the prompt picker (but stays a literal slash while you're typing
  in the journal).

This is pure interaction polish — no change to model behavior, prompts, scorer,
crisis detection, guardrails, or the AI-limitations disclaimer.

## What changed and why

| File | Change |
|------|--------|
| `src/utils/keyboardShortcuts.ts` *(new)* | Pure shortcut resolution — `resolveShortcut(event, ctx)` maps a keydown to one of `toggle-focus` / `new-session` / `open-prompt-picker` / `null`, and `isTypingTarget(target)` duck-types textarea/input/contenteditable. Split out so the rules are unit-testable in the repo's Node test env without rendering the model-loading App tree. |
| `src/App.tsx` | Added `focusMode` state; extracted the duplicated five-line new-session reset into a shared `handleNewSession` callback (header "New" button now uses it); added one consolidated document-level `keydown` handler that owns all three shortcuts (reads a fresh `modalOpenRef` so it never re-binds on modal toggles). Header / footer / sessions-sidebar wrappers get focus-aware fade/collapse classes; a low-contrast Esc-exit hint renders only in focus mode. |
| `src/components/ChatPanel.tsx` | Added an `open-prompt-picker` window-event listener (mirrors the existing `open-crisis-resources` bridge) that sets the already-existing `promptSelectorOpen` state. PromptSelector handles the rest via its existing `externalOpen` prop. |

### Design decisions

- **Modal precedence.** When any modal (crisis / mood / privacy / settings) is
  open, `Esc` is left for the modal's own close handler — it does **not** toggle
  focus mode. Encoded in `resolveShortcut` and covered by tests.
- **Safety surfaces stay reachable.** `pointer-events-none` is applied only to
  the header, footer, and sidebar — **never** to ChatPanel. The crisis/
  disclaimer affordances inside the writing surface remain clickable in focus
  mode.
- **`/` is literal in the journal.** The `isTypingTarget` guard means `/` typed
  into the journal textarea is a real slash; the shortcut only fires from
  non-typing targets (e.g. `document.body`).
- **`Cmd/Ctrl+N` caveat.** `Ctrl+N` / `Cmd+N` are browser-reserved for "new
  window". `preventDefault()` intercepts them in-page on most browsers; a few
  may still open a window. This is best-effort and acceptable for A6 (filler
  polish) — `N` was tried first per the roadmap and works in Chromium.
- **Loading-screen copy was already step-text.** `getLoadingMessage` already
  returns friendly step copy ("Setting up on-device intelligence…") with the
  real percentage. Left byte-identical; the loading-card screenshot confirms no
  regression.

## Tests

- `src/components/__tests__/KeyboardShortcuts.test.ts` (14) — `resolveShortcut`
  and `isTypingTarget`: Cmd/Ctrl+N → new-session (even with a modal open),
  Escape toggles focus only when no modal is open, `/` opens the picker from
  body but is ignored in a textarea or while a modal is open, unrelated keys and
  modified-Escape return null.
- `src/components/__tests__/FocusMode.test.ts` (10) — source-level wiring guards
  (App dims header/footer/sidebar in focus mode, renders the exit hint, never
  wraps ChatPanel in `pointer-events-none`) plus the modal-precedence rule and
  the `open-prompt-picker` bridge on both App and ChatPanel.
- Full suite: **1213/1213 green**. `npm run build` (TS strict) green.
- Freeze gate empty (`evalRunner.ts` / `evalScorer.ts` / `src/prompts/`); no
  edits to `crisisDetection`, `responseGuardrails`, `sessionContext`, or the
  disclaimer.

## Screenshots

`docs/screenshots/2026-06-23/`

- `normal.png` — welcome screen with full chrome.
- `focus-mode.png` — focus mode active: header/sidebar/footer gone, writing
  surface centered, "Press Esc to exit focus" hint bottom-right.
- `prompt-picker.png` — prompt picker opened via `/`.
- `loading-card.png` — loading card (for the record; unchanged).

## Next steps

Track A is complete. Remaining backlog is filler (B3 prompt-seeding); the daily
eval→tune loop continues to own model-quality drift.
