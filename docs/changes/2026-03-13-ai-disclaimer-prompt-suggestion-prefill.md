# AI Disclaimer, Journal Prompt Suggestions, and MoodTracker Pre-fill

## Summary

Added three improvements: (1) a persistent AI limitations disclaimer at the top of every chat session, (2) a journal prompt recommendation tool that detects conversation themes and suggests relevant prompts, and (3) MoodTracker pre-fill support when opening from the mood suggestion card's "Edit" button.

## Motivation

- **Overreliance risk** was flagged as the highest unaddressed safety concern in both prior safety reviews. Users in emotional distress may form dependency on the AI companion, delaying professional help. The disclaimer addresses this directly.
- **Journal prompt recommendation** is the second client-side tool in QuietNote's tool-calling architecture, validating the pattern's generalizability. It helps users who feel "stuck" during journaling.
- **MoodTracker pre-fill** was a limitation noted in the emotion extraction feature — clicking "Edit" opened a blank tracker instead of pre-filling the detected values.

## User impact

- Every chat session now shows a non-dismissable notice: "Quietnote is an AI journaling companion, not a therapist or mental health professional." with a direct link to crisis resources
- After emotionally themed messages, users may see a gentle prompt suggestion card offering a relevant journaling prompt from the curated database
- Clicking "Edit" on the mood suggestion card now opens MoodTracker pre-filled with the detected emotion and intensity
- All features respect existing guardrails: crisis suppression, cooldowns, dismiss limits

## Technical details

**New file: `src/utils/themeExtractor.ts`**
- `extractThemes(text)`: Scans text against keyword maps for 7 theme categories matching `PromptCategory` type. Returns `ThemeMatch[]` sorted by confidence.
- `getTopTheme(text, minConfidence)`: Convenience function returning highest-confidence theme or null.
- Word-boundary-aware regex matching, same pattern as `emotionExtractor.ts`.

**New file: `src/utils/__tests__/themeExtractor.test.ts`**
- 16 unit tests covering: empty text, neutral text, all 7 theme categories, multiple themes, case insensitivity, word boundaries, confidence ordering, custom thresholds.

**New file: `src/components/PromptSuggestionCard.tsx`**
- Inline card rendered after assistant messages when themes are detected
- Emerald-colored styling to visually differentiate from mood suggestion cards
- Two actions: "Use this prompt" (fills input) and Dismiss
- Framer Motion animation consistent with existing cards

**Modified: `src/components/ChatPanel.tsx`**
- Added AI limitations disclaimer at top of chat (non-dismissable, `AlertCircle` icon, stone-colored styling)
- Crisis resources link triggers custom event to open CrisisResources modal
- Integrated theme extraction + prompt suggestion card with guardrails:
  1. Minimum message length: 30 characters
  2. Cooldown: 1 suggestion per 5 assistant messages
  3. Crisis suppression: never show during crisis
  4. Session dismiss limit: 2 dismissals stops suggestions
  5. Category deduplication: don't repeat same category in session
  6. Negative emotion awareness: suppress gratitude prompts when sadness/anxiety detected
  7. Priority: mood suggestions take precedence over prompt suggestions

**Modified: `src/components/MoodTracker.tsx`**
- Added `initialEmotion` and `initialIntensity` optional props
- `useEffect` applies pre-fill values when modal opens with initial values

**Modified: `src/App.tsx`**
- Added `moodPreFill` state for passing emotion/intensity to MoodTracker
- Updated `onOpenMoodTracker` callback to accept emotion and intensity parameters
- Added event listener for `open-crisis-resources` custom event from disclaimer link
- Clears pre-fill state when MoodTracker closes

## Safety review

- **AI disclaimer**: Pure safety messaging — no risk, only benefit. Non-dismissable to ensure users always see it. Warm, respectful tone frames it as transparency, not a warning.
- **Theme extractor**: Client-side keyword matching only. No network, no data writes, no model dependency. False positives are safe (user just dismisses).
- **Prompt suggestion card**: Completely read-only — surfaces existing human-curated prompts from `journalPrompts.ts`. No new data generated or stored.
- **Gratitude suppression**: Gratitude prompts are suppressed when negative emotions (sad, anxious, angry, frustrated, lonely) are detected, preventing tone-deaf suggestions during distress.
- **MoodTracker pre-fill**: Values are easily editable — user has full control. Pre-fill only applies when opened from suggestion card, not when opened manually.
- **Crisis suppression**: All suggestion features completely disabled when crisis detection is active.
- **Failure modes**: Keyword matching may miss indirect expressions or produce false positives. Both are safe — no harm from false positives (user dismisses) or false negatives (no suggestion shown).

## Validation

- **Tests run**: 59 unit tests, all passing (16 new for themeExtractor, 22 for emotionExtractor, 21 for tokenEstimator)
- **Type checking**: Zero TypeScript errors (`tsc --noEmit` clean)
- **Browser testing**: App loads without errors, disclaimer visible at session start, crisis resources link works, no console errors
- **Red-team checks**:
  - Crisis keywords → crisis detection fires, suggestions suppressed (correct)
  - Neutral messages → no theme detected (correct)
  - Short messages → no suggestion (min length guard)
  - Gratitude keywords + sadness → gratitude prompt suppressed (correct)
  - Disclaimer is not dismissable (correct)

## Rollback / limitations

- **Revert**: Remove new files, revert modifications to ChatPanel.tsx, MoodTracker.tsx, and App.tsx. No database migration needed.
- **Limitations**:
  - Theme keyword matching is approximate — may miss abstract/metaphorical expressions
  - Prompt suggestions use random selection from category — no personalization yet
  - The "Use this prompt" action fills the input but doesn't auto-send (by design — preserves user agency)
  - Cooldown of 5 messages means prompt suggestions are infrequent (by design — avoids feeling pushy)

## Next steps

1. Conversation bookmark capability (user-initiated metadata annotation)
2. Mood pattern insight card (after 5+ logged moods, show simple trend observations)
3. Improve theme detection with bigram/trigram matching
4. Add overreliance disclaimer styling variants for first-time vs returning users
5. Automated evaluation framework for suggestion quality
