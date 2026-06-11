# Day 10 (BUILD day 3) — Empty-state simplification (Track A1, day 1)

**Date:** 2026-06-10
**Branch:** `feat/2026-06-10-empty-state-simplification`
**PR:** https://github.com/Guzzler/QuietNote/pull/56
**Roadmap item:** Track A — A1 (day 1 of ~2, screenshot-driven)

## Summary

The freewrite empty state went from a five-widget feature dashboard (streak pill, continuity card, correlations card, mood-trend card, 3-bullet feature tour, duplicate privacy copy — with the textarea below the fold) to one warm writing invitation: greeting, "Just start writing — whatever's on your mind.", at most one auxiliary element, a quiet prompt link, and a focused textarea. Fundamental Problem 4 ("feels like a tech demo, not a journal"), justified by real-user data: "just start writing" drove 36% of real entries.

**UI-only day — no model surface touched, no eval run, no north-star rows (Hard Rule 1 trivially satisfied).** Freeze gate `git diff origin/main -- src/utils/evalRunner.ts src/prompts/systemPrompts.ts` verified EMPTY. No edits to `crisisDetection.ts`, `responseGuardrails.ts`, `conversationContext.ts`, `responseShaping.ts`, the AI-limitations disclaimer, or the crisis-resources affordance.

## Removed vs relocated

| Element | Disposition |
|---|---|
| Time-aware greeting | **Kept** (logic untouched, `PersonalizedWelcome.test.ts` passes unchanged) |
| "A private space to reflect…" subtitle | **Replaced** with the writing invitation |
| Three streak pill variants | **Relocated** → muted `🔥 N-day streak` badge in the Sessions panel header, only for an active ≥2-day streak that includes today |
| ContinuityCard | **Kept** as the single allowed auxiliary element (wins over suggestion) |
| MoodJournalCorrelations card | **Removed from welcome** (insights still live in mood history/insights surfaces; component + utils untouched) |
| Mood-trend card + no-data placeholder | **Removed**; mood-aware suggestion collapses to one quiet text link (renders only when no continuity prompt) |
| 3-bullet feature tour | **Removed**; the prompt affordance survives as the quiet "or try a journal prompt" link |
| "Your thoughts are safe here." | **Removed** (footer keeps the privacy line; full consolidation is A3, not today) |

## Technical details

- **New `src/components/WelcomeEmptyState.tsx`** — extracted from ChatPanel (which shrank ~100 lines). Contract logic lives in **`src/utils/welcomeEmptyState.ts`**: `INVITATION_TEXT`, `pickAuxiliaryElement(continuity, suggestion)` → `"continuity" | "suggestion" | "none"` (tests are logic-level per repo convention — no render-testing framework added).
- **ChatPanel** — dead `welcomeCorrelations` memo, `computeStreak` usage, and 7 now-unused lucide imports removed. Textarea auto-focuses on the freewrite empty state (re-fires when model loading completes, since the panel mounts behind the loading screen) and gets `min-h-[88px]` empty-state presence vs `min-h-[52px]` in conversation; `focus:outline-none` so the soft indigo ring shows instead of the browser default black outline.
- **`JournalingModeSelector`** — boxed `border bg-slate-50` segmented-control chrome dropped; ghost buttons (`text-slate-400 hover:text-slate-600`), soft active state (`text-indigo-600 bg-indigo-50/70 rounded-md`), `min-h-[36px]` tap targets. `role="radiogroup"`, `role="radio"`, `aria-checked`, icons, labels, overflow behavior all preserved; all 4 modes visible.
- **`SessionsPanel`** — computes streak from its existing `sessions` prop; badge text via new `getStreakBadgeText(info)` in `src/utils/streakTracker.ts` (null when streak < 2 or not journaled today).
- **`Layout`** — dropped `min-h-screen` (ChatPanel already guarantees `min-h-[75vh]`), which was the structural cause of scrolling: header + full-viewport content row + footer always exceeded the viewport.

## Mock checkpoint (mandatory, recorded)

`06-empty-state-mock-desktop.png` taken after the skeleton rendered, before polish. Acceptance criteria checked and **passed**:

- Empty freewrite view contains ONLY: greeting, invitation line, ≤1 auxiliary element, prompt link, textarea + send, quiet mode strip. ✓
- Zero privacy copy above the footer; zero streak copy; zero mood-trend/correlations cards. ✓ (verified via rendered `innerText` dump)
- No scrolling at 1280×800 (`scrollHeight === 800`) or 390×844; the eye lands on the focused textarea. ✓ (the scroll fix required the Layout change above)

## Tests

- **New `WelcomeEmptyState.test.ts`** — auxiliary precedence (continuity > suggestion > none); invitation contains "writing" and never mentions privacy/device/mood/streak/safe; source-level guard that the six removed dashboard strings stay out of `WelcomeEmptyState.tsx` and `ChatPanel.tsx`, and that ChatPanel no longer references `MoodJournalCorrelations`/`computeStreak`.
- **New `SessionsPanelStreakBadge.test.ts`** — badge for active streak incl. today (`🔥 3-day streak`); null for single day, broken streak, not-today streak, no sessions.
- `PersonalizedWelcome.test.ts` and `JournalingModeSelector.test.ts` pass unchanged (no class-string assertions existed).
- **Full suite: 1054/1054** (was 1037). `npm run build` green. Touched files lint-clean (repo has 119 pre-existing lint problems, unchanged).

## Browser verification

All 4 modes verified in-browser after the change: Free Write → WelcomeEmptyState; Gratitude → "Gratitude Journal, Step 1 of 3"; Check-in → "Evening Check-in, Step 1 of 3"; Thought Record → "Step 1 of 5". With-data state (10 seeded sessions, 10 moods, 5-day streak) confirms the dashboard cards are gone and the continuity card renders as the single auxiliary element.

## Screenshots (docs/screenshots/2026-06-10/)

| | |
|---|---|
| `03-empty-state-before-desktop.png` | Before, fresh profile, 1280×800 (input row below the fold) |
| `04-empty-state-before-mobile.png` | Before, fresh profile, 390×844 |
| `05-empty-state-before-withdata-desktop.png` | Before, seeded data — streak pill + continuity + mood-trend cards + tour |
| `06-empty-state-mock-desktop.png` | Mock checkpoint (acceptance criteria pass) |
| `07-empty-state-after-desktop.png` | After, fresh profile — invitation + suggestion link + focused textarea, no scroll |
| `08-empty-state-after-mobile.png` | After, 390×844, no scroll |
| `09-empty-state-after-withdata-desktop.png` | After, seeded data — continuity card as single auxiliary element |
| `10-sessions-streak-badge.png` | Muted streak badge in Sessions header |

## Next steps

- **A1 day 2:** post-screenshot tweaks if any (e.g. icon-tile softening, spacing), then **A2 visual calm pass** prep (paper surface, serif writing surface, one accent color).
- Pre-existing footer mojibake (`Quietnote â€¢` — encoding artifact in `App.tsx`) noticed during screenshotting; small standalone fix, not part of A1.
- B1 (input-robustness eval cases) remains the right pick for an EVAL-flavored day.
