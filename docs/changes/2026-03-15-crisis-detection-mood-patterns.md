# Enhanced Crisis Detection & Mood Pattern Analysis

## Summary

Expanded crisis detection to catch indirect expressions of distress (indirect suicidal ideation, passive death wishes, farewell language, escalating hopelessness) and created a mood pattern analysis utility that surfaces trends, correlations, and frequency patterns from logged mood entries. Added comprehensive test suites for both — the first automated tests for crisis detection, QuietNote's most safety-critical code.

## Motivation

- **Crisis detection gap**: The existing crisis detection relied solely on explicit keyword matching. Users in distress often don't use words like "suicide" — they say things like "I don't see the point anymore" or "everyone would be better off without me." These are well-documented expressions of suicidal ideation that crisis counselors are trained to recognize. In a mental health app, missing these is an unacceptable gap.
- **Mood tracking gap**: Mood logging existed but produced no insights. Users could log moods but never see patterns. The `MoodPattern` and `WellnessReport` types were designed on Day 1 but never implemented.
- **Test coverage gap**: Crisis detection had zero automated tests despite being the most safety-critical code in the app. This was flagged in every prior safety review.

## User impact

- Users expressing distress indirectly (e.g., "I can't do this anymore", "wish I could disappear") will now see crisis resources — potentially catching people who need help most
- Indirect expressions show resources gently (`show_resources`) rather than urgently (`immediate_help`), appropriate for expressions that may have non-crisis interpretations
- Mood pattern analysis enables future UI features (mood insights card, weekly reports) that transform mood logging from passive data collection into actionable self-awareness
- All pattern descriptions use observational language ("You logged anxious 4 times") — never diagnostic language

## Technical details

**Modified: `src/utils/crisisDetection.ts`**
- Added `CrisisMatchType` type: `"keyword" | "indirect" | "contextual"` — allows UI to distinguish between match types
- Added `matchType` field to `CrisisDetectionResult`
- Added 4 new phrase arrays: `INDIRECT_HIGH_PHRASES` (13 phrases), `PASSIVE_DEATH_WISH_PHRASES` (10 phrases), `FAREWELL_PHRASES` (9 phrases), `ESCALATING_HOPELESSNESS_PHRASES` (13 phrases)
- Extended `detectCrisis()` to check all new categories after explicit keywords
- Indirect expressions set severity but only `show_resources` action (never `immediate_help` alone)
- Added `SEVERITY_RANK` for cleaner severity comparison logic
- All existing behavior fully preserved — backward compatible

**New: `src/utils/moodPatterns.ts`**
- `analyzeMoodTrend()`: Compares negative emotion intensity in first/second half of period. Threshold of 1.0 to avoid noise.
- `findTopEmotions()`: Frequency-sorted emotion counts
- `findTopContexts()`: Frequency-sorted context counts from contexts arrays
- `detectCorrelations()`: Finds emotion-context pairs with 3+ co-occurrences, returns `MoodPattern[]`
- `detectDayOfWeekPatterns()`: Finds dominant emotions per day of week
- `generateWeeklyReport()`: Aggregates all analysis into a `WellnessReport` with observational insights
- All functions are pure — accept mood arrays, return analysis. No side effects.
- Constants: `MIN_ENTRIES_FOR_PATTERNS = 5`, `MIN_COOCCURRENCES = 3`

**New: `src/utils/__tests__/crisisDetection.test.ts`**
- 81 tests covering: all explicit keywords by severity, all indirect phrases by category, case insensitivity, multi-keyword severity escalation, combined explicit + indirect behavior, false positive resilience, `getCrisisResources`, `getCrisisResponseMessage`

**New: `src/utils/__tests__/moodPatterns.test.ts`**
- 33 tests covering: trend detection (improving/declining/stable), top emotions/contexts, correlation detection with minimum thresholds, report generation, observational language enforcement, edge cases (empty data, single entry, all same emotion)

## Safety review

- **Why safe**: All changes are pure logic — no new data flows, storage, network access, or UI modifications. Crisis detection expansion can only help (showing resources to someone who may need them). False positives show helpful resources that are never harmful.
- **Indirect expressions → show_resources only**: This is a critical design decision. Indirect expressions alone never trigger `immediate_help` (which auto-injects crisis messages). They only `show_resources` (which opens the crisis resources modal). This prevents over-alarming users who may be using casual language.
- **Combined escalation**: If both explicit keywords AND indirect expressions are present, the explicit keyword's action takes precedence (e.g., "suicidal" → `immediate_help`). The `matchType` stays `"keyword"` when explicit matches are present.
- **False positive stance**: In a mental health context, false positives are strictly safer than false negatives. "I'm done fighting with this code" will trigger detection — and that's acceptable. The crisis resources shown are always helpful, never harmful.
- **Mood patterns — no diagnostic language**: Every description uses "You logged..." not "You have..." or "You are...". The declining trend insight includes "support is always available." No pattern is presented as clinical assessment.
- **Minimum thresholds**: Patterns require 5+ entries, correlations require 3+ co-occurrences. This prevents unreliable conclusions from small samples.
- **No mental health risk**: Mood patterns are read-only analysis of user's own data. No recommendations, no predictions, no comparisons. Observational only.

## Validation

- **Tests**: 173 total tests passing (114 new: 81 crisis detection + 33 mood patterns)
- **Type checking**: `tsc --noEmit` — zero errors
- **Browser testing**: App loads correctly, no console errors, all existing UI renders properly
- **Red-team checks**:
  - Indirect crisis expression → resources shown, not immediate_help (correct)
  - Explicit keywords → immediate_help preserved (backward compatible)
  - Combined indirect + explicit → highest severity wins (correct)
  - Benign text with partial phrase matches → appropriately handled
  - Mood patterns with insufficient data → safe defaults returned
  - Declining trend insight → includes supportive language (correct)
  - All insights → observational language only (verified by test)

## Rollback / limitations

- **Revert**: Remove `moodPatterns.ts` and its test file. Revert `crisisDetection.ts` to remove indirect phrases and `matchType` field. Remove crisis detection test file. No database or UI changes to revert.
- **Limitations**:
  - Phrase matching is substring-based, not NLP. "There's no point guard on the team" will match "there's no point." This is acceptable in a mental health context (false positives > false negatives).
  - Mood patterns are not yet surfaced in the UI — this is an analysis utility only. A mood insights card is the natural next step.
  - Day-of-week patterns require sufficient data spread across different days to be meaningful.
  - `generateWeeklyReport` sets `journalCount` and `thoughtRecordCount` to 0 since these aren't tracked by mood entries alone.

## Next steps

1. **Mood insights card** — Surface pattern analysis in the UI after 5+ moods logged (read-only, observational)
2. **Weekly wellness check-in** — At session start, show mood summary for context
3. **Improve phrase matching** — Consider word boundary awareness for reduced false positives where safe to do so
4. **Integration tests** — Test crisis detection integration with ChatPanel (end-to-end flow)
5. **Conversation summarization** — Needs safeguards before implementation
