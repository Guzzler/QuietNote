# Continuity Card, Session Reflections, and AI Personality Settings

**Date**: 2026-05-21
**PR**: #38
**Branch**: `feat/2026-05-21-continuity-reflections-settings`

## Summary

Three features that make QuietNote feel like a companion that remembers you, rather than a blank canvas every time you open it.

## What Changed

### 1. Continuity Card on Welcome Screen

When a returning user opens QuietNote, a card appears on the welcome screen suggesting they pick up where they left off. Three variants:

- **Last session** (within 7 days): "Yesterday, you wrote about feeling stressed about work. How are you feeling about that today?"
- **Recurring theme** (same theme across 2+ sessions): "You've been reflecting on relationships across recent sessions. Want to go deeper?"
- **Mood follow-up** (declining/improving trend): "Your mood has been lower lately. Sometimes writing about what's weighing on you can help."

Clicking the card pre-fills the textarea with a contextual starter and focuses it.

**Files**: `src/utils/continuityPrompt.ts`, `src/components/ContinuityCard.tsx`, `src/components/ChatPanel.tsx`

### 2. Auto-Generated Session Reflections

Each session now gets a 1-sentence summary generated from user messages using theme and emotion extraction:

- Themes + emotion: "Worked through anxious feelings around relationships."
- Themes only: "Reflected on goals and growth."
- Emotion only: "Sat with sad feelings."
- Fallback: First 10 words of first message.

Displayed below session titles in the sessions panel. Generated after each AI reply, persisted to IndexedDB.

**Files**: `src/utils/sessionReflection.ts`, `src/types.ts` (Session.reflection), `src/components/SessionsPanel.tsx`, `src/App.tsx`

### 3. AI Personality Settings Panel

New Settings button in the header opens a modal with:
- **Warmth** slider (0-10): Clinical → Very warm
- **Response length**: Concise (1-2 sentences) / Balanced (2-4) / Detailed (5-6)
- **Conversation style**: Supportive / Socratic / Direct

Settings persist to IndexedDB (new settings store, DB v3) and are injected into the system prompt as personality directives.

**Files**: `src/utils/personalityPrompt.ts`, `src/components/SettingsPanel.tsx`, `src/storage.ts`, `src/App.tsx`

## Tests Written

- `src/utils/__tests__/continuityPrompt.test.ts` — 6 tests (null cases, last-session, recurring-theme, mood-followup, current session exclusion)
- `src/utils/__tests__/sessionReflection.test.ts` — 8 tests (empty sessions, themes-only, emotion+theme, fallback, shouldRegenerate)
- `src/utils/__tests__/personalityPrompt.test.ts` — 8 tests (default settings, each warmth/verbosity/style variant, combined)

**Total**: 896 tests passing (was 874).

## Next Steps

- Test continuity card and reflections with real multi-session usage
- Consider adding personality setting descriptions/tooltips
- Mood-journal correlation view (backlog)
