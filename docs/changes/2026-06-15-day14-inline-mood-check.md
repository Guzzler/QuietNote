# 2026-06-15 — Day 14: Inline mood check (Track A4)

## Summary

Mood capture now happens at the natural moment — the start of a free-write
entry — instead of behind an ambiguous header icon. A gentle **"How are you
feeling?"** chip row appears in the free-write empty state; one tap logs a
lightweight mood and offers an "add detail" path into the full tracker. The
captured mood immediately enriches the AI's context through the already
mood-aware `buildSessionContext` (no prompt or eval change).

This closes roadmap item **A4** (Track A — "tech demo → journal", Fundamental
Problem 4). It applies the same principle A1 proved for writing ("the right
affordance at the right moment" beats "a button in the chrome") to mood.

## What changed and why

### 1. Inline "How are you feeling?" row at free-write entry start
- **New `src/components/InlineMoodCheck.tsx`** — presentational. A small label +
  a wrapped row of **6 curated calm chips** (`Happy, Calm, Anxious, Sad,
  Frustrated, Grateful`) and a quiet **"more…"** link. One tap calls `onPick`
  and switches the row to a subtle confirmation (`role="status"`
  `aria-live="polite"` — "Noted — feeling {x}.") with a working **"add detail →"**
  and a **"change"** affordance. Calm palette only: neutral slate chips, indigo
  accent — **no per-emotion colors** (the full tracker keeps those). 44px tap
  targets, per-chip `aria-label`.
- **New `src/utils/quickMood.ts`** — pure helper `makeQuickMoodEntry(emotion,
  sessionId?)` returns a valid lightweight `MoodEntry` (`id` via
  `crypto.randomUUID()` — the same generator `MoodTracker` uses — `intensity: 5`
  neutral default, `contexts: []`, `sessionId` only when present). Isolated so
  the one piece of logic is unit-tested.
- **Wired** `WelcomeEmptyState` → `ChatPanel` → `App`: the row renders between
  the invitation and the "journal prompt" link. `onPickMood` saves through the
  **existing** `onSaveMood`; `onAddMoodDetail` opens the full `MoodTracker`
  pre-filled through the **existing** `onOpenMoodTracker`. No new save plumbing.
- **Keyword extraction stays the fallback** — `emotionExtractor` is untouched;
  entries where nobody taps a chip get keyword-derived emotion exactly as today.
  The row is purely additive.

### 2. Header Heart re-scoped (not removed) — deliberate spec correction
The roadmap says *"Replace the ambiguous header heart entry point."* Taken
literally that means deleting the header button — but the `MoodTracker` modal it
opens is the **only** route to **Mood History + Insights**. Deleting it would
**orphan two built features**, which the standing rules forbid. A4's real intent
— *make mood capture contextual and unambiguous* — is delivered by the inline
row (capture now lives where you write). So the header entry is **kept and
re-scoped**, not removed:
- Label/tooltip/`aria-label` changed from the ambiguous "Track your mood" to
  **"Mood history & details"**.
- New optional `initialTab` prop on `MoodTracker`; `App` passes
  `initialTab={allMoods.length > 0 ? "history" : "log"}` so the header opens on
  **History** once mood data exists (a pre-fill emotion from "add detail" still
  forces the Log tab). Mood History/Insights remain fully reachable.

## Technical details
- `MoodTracker` gains `initialTab?: "log" | "history"` and an effect that sets
  the active tab on open (`initialEmotion ? "log" : initialTab ?? "log"`). The
  existing reset-on-close logic is untouched.
- Mood → prompt path unchanged: `buildSessionContext` already derives
  `recentEmotions`/`moodTrend` from stored moods and injects them into the system
  prompt. A freshly-tapped mood flows there on the next turn automatically — this
  is why the day is freeze-safe.

## Tests
- **New `src/utils/__tests__/quickMood.test.ts`** (3) — valid `MoodEntry` with
  neutral defaults & no `sessionId` key when omitted; `sessionId` included when
  given; distinct ids on successive calls.
- **New `src/components/__tests__/InlineMoodCheckGuards.test.ts`** (4) — label
  present; calm palette (no `purple-`/`emerald-`/`hover:shadow`); `aria-live`/
  `role="status"` confirmation present; rendered from `WelcomeEmptyState`.
- **Extended `VisualCalmGuards.test.ts`** — `InlineMoodCheck.tsx` added to
  `WRITING_PATH_COMPONENTS` (permanently held to the no-`purple-`/no-`emerald-`
  rule).
- Full suite **1100/1100** green; `npm run build` green.
- **Freeze gate empty:** `git diff origin/main -- src/utils/evalRunner.ts
  src/utils/evalScorer.ts src/prompts/` produced no output. No edits to
  `crisisDetection.ts`, `responseGuardrails.ts`, `conversationContext.ts`,
  `responseShaping.ts`, `sessionContext.ts`, or the disclaimer copy.

## Screenshots
Before / mock / after in `docs/screenshots/2026-06-15/` (`01`–`09`), desktop
1280×800 and mobile 390×844. Verified in-browser via Playwright: tap → inline
confirmation; add-detail → MoodTracker pre-filled (intensity 5, "1 logged");
re-scoped header opens History showing the logged Anxious 5/10 entry.

## Scope note
UI + mood-metadata only — no model/prompt/scorer surface touched. The inline row
writes a normal `MoodEntry`, which the already mood-aware `buildSessionContext`
consumes unchanged. No eval run required; no north-star rows (Hard Rule 1
trivially satisfied).

## Next steps
Track A's remaining committed items are A5 (sidebar previews, low) and A6
(focus/keyboard, filler). Per sequencing, the planner may slot A5 next or pivot
to **C1** (long-conversation harness — the unmeasured residual risk on
Problem 2).
