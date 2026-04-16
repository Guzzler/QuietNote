# 2026-04-15 — Mood History Timeline, Session Search, Smart Titles

## Summary
Added mood history timeline as a tab in the MoodTracker modal, session search/filter in the SessionsPanel, and word-aware session title truncation.

## What Changed

### Mood History Timeline
- **`src/components/MoodHistoryPanel.tsx`** (new): Scrollable list of mood entries grouped by date (Today, Yesterday, This Week, Earlier). Each entry shows emotion label with color, intensity bar (1-10), context tags, optional note, and timestamp. Entries linked to sessions have a "View session" link. Empty state guides users to the Log Mood tab.
- **`src/components/MoodTracker.tsx`**: Added tab bar with "Log Mood" and "History" tabs. Header title and subtitle update per tab. Footer buttons hidden on History tab. Added `onViewSession` prop for navigating to linked sessions.
- **`src/App.tsx`**: Wired `onViewSession` to close modal and load the linked session.

### Session Search
- **`src/components/SessionsPanel.tsx`**: Added search input with magnifying glass icon and clear button. Filters sessions by title and first user message content (case-insensitive substring). Shows "No matching sessions." when filter yields no results.

### Smart Session Titles
- **`src/App.tsx`**: New `smartTitle()` function replaces `firstMessage.slice(0, 48)`. Extracts first sentence (up to 80 chars at sentence boundary) or falls back to first 10 words with ellipsis. No mid-word truncation.

## Why
- **Mood History**: Users could log moods but couldn't see them — logging felt like shouting into a void. A visible history creates the feedback loop that makes journaling habit-forming.
- **Session Search**: As sessions accumulate, users need to find past entries. Search makes journaling feel like a personal archive.
- **Smart Titles**: Character-based truncation cut words mid-way, making titles hard to scan.

## Technical Details
- MoodHistoryPanel uses `useMemo` for date grouping to avoid recomputation
- Session filtering uses `useMemo` with `searchQuery` dependency for efficient re-renders
- Tab state resets to "log" when MoodTracker modal reopens (via existing reset logic)
- All date grouping uses midnight boundaries for consistent Today/Yesterday bucketing

## Tests
- 24 new tests (400 total passing):
  - `MoodHistoryPanel.test.ts`: 7 tests — empty state, date grouping (today/yesterday/this week/earlier), multiple groups, data preservation
  - `SessionSearch.test.ts`: 8 tests — empty query, title match, content match, case-insensitive, no match, partial match, multiple matches, empty sessions
  - `SmartTitle.test.ts`: 9 tests — empty input, short messages, sentence extraction (./!/? boundaries), word truncation, ellipsis, long sentences, no mid-word cuts

## Screenshots
- `docs/screenshots/2026-04-15/mood-tracker-log-tab.png`
- `docs/screenshots/2026-04-15/mood-tracker-history-tab.png`
- `docs/screenshots/2026-04-15/after-message-submit.png`
- `docs/screenshots/2026-04-15/chat-mobile-375px.png`
- `docs/screenshots/2026-04-15/welcome-desktop.png`

## Next Steps
- Mood history with real entries (visual mood chart in a future session)
- Mood-journal correlation view
- Time/mood-aware prompt suggestions
