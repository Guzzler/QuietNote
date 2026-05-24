# Mood-Journal Correlations, ThoughtRecord History, Time-of-Day Prompts

**Date**: 2026-05-23
**PR**: #39
**Branch**: `feat/2026-05-23-mood-correlations-thoughtrecord-history-time-prompts`

## Summary

Three features that turn QuietNote's accumulated mood and journal data into real personal insight, completing the planned deliverables for 2026-05-23.

## What Changed

### 1. Mood-Journal Correlation View (Priority 1)

**New utility** (`src/utils/moodJournalCorrelations.ts`): Cross-references journal session themes with mood entries to produce plain-English observations. Links moods to sessions via `sessionId` or time proximity (±2 hours, same calendar day). Restricts analysis to the last 60 days.

**Observations produced**:
- `theme-emotion`: "You tend to feel anxious when writing about challenges (5 of 7 sessions)"
- `best-mood-theme`: "Sessions about gratitude correlate with your highest mood ratings"
- `worst-mood-theme`: "Writing about challenges tends to come with lower mood" (only when score ≤ 4)

**Confidence levels**: high (≥8 sessions), medium (5-7), low (3-4). Low-confidence dropped when higher exists. Capped at 4 observations.

**New component** (`src/components/MoodJournalCorrelations.tsx`): Renders observations as a card with confidence dots. Matches existing MoodInsightsCard styling.

**Integrations**:
- MoodHistoryPanel: Correlations card rendered at top
- ChatPanel welcome: Shown when ≥2 high/medium observations exist

### 2. ThoughtRecord Structured Persistence + History (Priority 2)

**Storage** (`src/storage.ts`): DB version bumped 3→4. New `thoughtRecords` object store with `sessionId` and `ts` indexes. CRUD: `saveThoughtRecord`, `listThoughtRecords`, `deleteThoughtRecord`.

**Auto-save** (`src/App.tsx`): When a Thought Record exercise completes (step 6), the 5 user messages are parsed into a structured `ThoughtRecord` object and persisted automatically. Emotion parsing extracts recognized emotion keywords and intensity from the user's step 3 response.

**History modal** (`src/components/ThoughtRecordHistory.tsx`): Lists past records newest-first showing date, situation, automatic thought, alternative thought, and intensity delta badge. Delete with confirmation dialog. ARIA: focus trap via Escape key, modal role.

**Entry point**: "View Thought Records" button in MoodHistoryPanel, visible only when ≥1 record exists.

### 3. Time-of-Day Aware Prompt Suggestions (Priority 3)

**Time bucket utility** (`src/utils/timeOfDay.ts`): Maps current hour to morning (5-11), afternoon (12-16), evening (17-21), night (22-4).

**Tagged prompts**: 15 of 64 prompts tagged with `timeOfDay`:
- Morning: gratitude-1, gratitude-5, reflection-1, goals-1, goals-6
- Afternoon: reflection-7
- Evening: gratitude-3, reflection-2, challenges-1, challenges-5
- Night: gratitude-8, reflection-10, challenges-6, creativity-5

**Selection logic**: `getPromptByCategory` and `getRandomPrompt` prefer time-matched prompts with 70% probability when available, falling back to any prompt otherwise.

## Technical Details

- `JournalPrompt` type extended with optional `timeOfDay` field
- `MoodHistoryPanel` and `MoodTracker` accept new `sessions` prop for correlation computation
- `clearAllData` updated to include `thoughtRecords` store
- All hooks called before early returns (React rules of hooks compliance)

## Tests

21 new tests (917 total, all passing):
- `moodJournalCorrelations.test.ts`: 11 cases — empty inputs, theme-emotion correlation, best/worst mood themes, 60-day cutoff, time proximity linking, all-same-emotion, output cap, confidence levels
- `timeOfDay.test.ts`: 10 cases — all bucket boundaries (4:59→night, 5:00→morning, 12:00→afternoon, 17:00→evening, 22:00→night, midnight, 3 AM)

## Next Steps

- Seed real session/mood data to validate correlation quality
- Test ThoughtRecord auto-save on real device with WebGPU model
- Consider adding `mode-impact` observation (mood after Gratitude vs Free Write)
- CognitiveDistortion auto-detection from ThoughtRecord data (backlog)
