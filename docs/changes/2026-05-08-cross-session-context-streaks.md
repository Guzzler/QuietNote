# Cross-Session Context & Journaling Streak Tracking

## Summary

Two features that make QuietNote feel more like a journaling companion and less like a blank page:

1. **Cross-session context** — The AI system prompt now includes a brief summary of the user's recent journal themes, mood trend, and last session topic. This means the AI can acknowledge what the user has been working through instead of starting cold every time.

2. **Journaling streak tracking** — The welcome screen shows a streak counter for consecutive journaling days, encouraging daily habit formation.

## What Changed

### Cross-Session Context (`src/utils/sessionContext.ts`)
- `buildSessionContext()` — Analyzes the last 3 sessions (excluding current) to extract themes, recent emotions, mood trend, and a 1-sentence summary of the most recent session
- `formatContextForPrompt()` — Formats the context into a concise block (under 350 chars) appended to the system prompt
- Integrated into `App.tsx` — both `newSession()` and `replyInThread()` now build and inject context

### Streak Tracking (`src/utils/streakTracker.ts`)
- `computeStreak()` — Groups sessions by calendar day, counts consecutive days, tracks longest streak and total days
- Integrated into `ChatPanel.tsx` welcome screen with three states:
  - 🔥 "N-day journaling streak!" (2+ consecutive days)
  - ✓ "You've journaled today" (1 day, today)
  - "Start a new streak — your best was N days" (broken streak with history)
  - Hidden for new users (0 sessions)

### Files Modified
- `src/App.tsx` — Import sessionContext, inject into system prompt
- `src/components/ChatPanel.tsx` — Import streakTracker, add sessions prop, render streak pill

## Tests Written
- `src/utils/__tests__/sessionContext.test.ts` — 10 tests covering empty state, session exclusion, theme extraction, mood trends, graceful handling
- `src/utils/__tests__/streakTracker.test.ts` — 8 tests covering zero sessions, consecutive days, gaps, longest vs current, same-day dedup, today detection

## How to Verify
1. Start the app with existing sessions → welcome screen shows streak counter
2. Send a message → system prompt in console includes "Context about this user:" block with recent themes
3. With no prior sessions → no context appended, no streak shown
