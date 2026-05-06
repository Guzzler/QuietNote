# Wellness Summary, Personalized Welcome, Dismissible Trim Notice

**Date:** 2026-04-16
**Branch:** feat/2026-04-16-wellness-summary-personalized-welcome

## Summary

Three features that make mood tracking more rewarding and the journaling experience more personal:

1. **Weekly Wellness Summary** — Surfaces the already-computed `WellnessReport` data prominently in the MoodTracker History tab
2. **Personalized Welcome Screen** — Time-of-day greetings and mood-aware journaling mode suggestions
3. **Dismissible Context Trimming Notice** ��� Users can now dismiss the "earlier messages trimmed" notice

## What Changed and Why

### 1. WellnessSummary Component (`src/components/WellnessSummary.tsx`)
- New component that takes `moods: MoodEntry[]` and renders the wellness report
- Below 5 entries: shows encouraging progress bar ("Log N more moods to unlock your wellness summary")
- 5+ entries: shows trend indicator (improving/stable/declining), average intensity, top emotions (colored pills), life areas, detected patterns, and observational insights
- Uses `useMemo` to avoid recomputing the report on every render
- Styled consistently with MoodHistoryPanel (slate/indigo palette, rounded cards)

### 2. MoodTracker Integration (`src/components/MoodTracker.tsx`)
- WellnessSummary rendered above MoodHistoryPanel in the History tab

### 3. Personalized Welcome (`src/components/ChatPanel.tsx`)
- Welcome screen now shows time-of-day greeting (Good morning/afternoon/evening/Hello)
- With mood data (5+): shows mood trend indicator and top emotion
- With recent anxious/frustrated moods: suggests Thought Record mode
- Morning/evening: suggests Check-in mode
- Without mood data: shows gentle encouragement to track mood

### 4. Dismissible Trim Notice (`src/components/ChatPanel.tsx`)
- Added `showTrimNotice` state with X button to dismiss
- Resets to visible when a new trim event occurs (useEffect on `contextTrimmed`)

### 5. Centralized Moods State (`src/App.tsx`)
- Added `allMoods` state loaded on mount via `listMoods()`
- Refreshed after `handleSaveMood` completes
- Passed to ChatPanel as `moods` prop (avoids double-fetching)

## Technical Details

- All mood analysis comes from existing pure functions in `moodPatterns.ts`
- No new dependencies added
- Emotion colors/labels reuse the pattern from MoodHistoryPanel
- Trend config uses lucide-react icons (TrendingUp, TrendingDown, Minus)

## Tests Written

- **WellnessSummary.test.ts** (6 tests): Report generation with <5 entries, 5+ entries, top contexts, average intensity, empty patterns
- **PersonalizedWelcome.test.ts** (11 tests): Time-of-day greetings, mode suggestions, mood trend display, thought record override
- **DismissibleTrimNotice.test.ts** (5 tests): Show/hide logic, dismiss, re-show on new trim event

All 422 tests passing. Build succeeds with zero new TypeScript errors.

## Verification

- Welcome screen: time-appropriate greeting renders correctly
- MoodTracker History tab: WellnessSummary renders above mood list with progress indicator
- Mobile (375px): no layout overflow on any new components
- No new console errors

## Next Steps

- Visual mood chart (line/bar chart showing intensity over time)
- Mood-journal correlation view
- Mood-aware prompt selection
