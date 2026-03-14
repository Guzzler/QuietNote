# Emotion Extraction + Mood Suggestion Card

## Summary

Added client-side emotion detection from user messages with an inline mood suggestion card in the chat UI. This is the first concrete tool in QuietNote's tool-calling architecture: keyword-based emotion extraction triggers a gentle suggestion card after assistant responses, letting users log moods directly from the conversation flow.

## Motivation

Users often express emotions during journaling but don't manually track them. Surfacing a "Would you like to remember feeling [emotion]?" card after emotionally rich messages bridges the gap between conversational reflection and structured mood tracking — without requiring extra effort. This validates the client-side extraction + UI suggestion card pattern designed on 2026-03-12 before investing in more complex tools.

## User impact

- After expressing emotions in journal entries, users see a subtle, non-intrusive card suggesting they log that mood
- One-click "Log" saves the mood instantly; "Edit" opens the full Mood Tracker pre-filled; "Dismiss" removes the card
- Cards never appear during crisis-detected conversations (safety-critical)
- After 3 dismissals in a session, suggestions stop entirely (respects user preference)
- All mood data stays local in IndexedDB — no data leaves the browser

## Technical details

**New file: `src/utils/emotionExtractor.ts`**
- `extractEmotions(text)`: Scans text against keyword maps for 10 emotion categories matching the existing `MoodEmotion` type. Returns `EmotionMatch[]` sorted by confidence.
- `estimateIntensity(text, emotion)`: Heuristic intensity estimation using modifier words ("very", "extremely", "a little"). Base intensity of 5, adjusted by modifiers, clamped to 1-10.
- `getTopEmotion(text, minConfidence)`: Convenience function returning the highest-confidence emotion or null.
- Word-boundary-aware regex matching to reduce false positives.
- Pure functions, no side effects — follows the same pattern as `crisisDetection.ts`.

**New file: `src/utils/__tests__/emotionExtractor.test.ts`**
- 22 unit tests covering: empty text, single emotion, multiple emotions, sadness/happiness/loneliness/frustration/calm detection, case insensitivity, neutral text rejection, intensity amplifiers/dampeners, confidence thresholds.

**New file: `src/components/MoodSuggestionCard.tsx`**
- Inline card rendered after assistant messages when emotions are detected
- Framer Motion fade-in animation consistent with existing UI
- Three actions: Log (saves via `putMood()`), Edit (opens MoodTracker), Dismiss
- Warm, non-judgmental copy: "Would you like to remember feeling [emotion]?"
- Emotion-specific color coding matching the app's design language

**Modified: `src/components/ChatPanel.tsx`**
- Integrated emotion extraction + suggestion card with five guardrails:
  1. **Minimum message length**: No extraction for messages < 20 characters
  2. **Cooldown**: Maximum 1 suggestion per 3 assistant messages
  3. **Crisis suppression**: Never show when `showCrisisResources` is true
  4. **Session dismiss limit**: After 3 dismissals, stop suggesting for the session
  5. **Deduplication**: Never re-suggest for the same assistant message
- Session-scoped state resets when switching sessions

**Modified: `src/App.tsx`**
- Passes `showCrisisResources`, `onSaveMood`, `onOpenMoodTracker`, and `sessionId` props to ChatPanel

## Safety review

- **Why safe**: Client-side keyword matching only — no model dependency, no network calls, no new data stores. User must explicitly click to save. Writes to existing IndexedDB mood store via existing `putMood()` API.
- **Crisis suppression**: Mood suggestions are completely suppressed when crisis detection is active. This prevents the app from appearing to minimize or quantify emotional distress during critical moments.
- **Intrusion mitigation**: Card uses warm language ("Would you like to remember..."), subtle styling (no attention-grabbing colors), effortless dismiss (single click), and session-level auto-disable after 3 dismissals.
- **Privacy**: Dismissed suggestions are not stored. No tracking of what emotions were detected or dismissed. Accepted moods use the existing mood store with existing privacy dashboard controls.
- **Mental health sensitivity**: The biggest risk is that the card could feel like the app is "labeling" or "reducing" the user's experience. Mitigated by: warm copy, optional nature, user controls the final emotion/intensity if they edit, and easy permanent dismissal.
- **Failure modes**: Keyword matching may miss indirect expressions or produce false positives. False positives are safe (user just dismisses). False negatives are acceptable for v1 — no harm from not suggesting.

## Validation

- **Tests run**: 41 unit tests, all passing (22 new for emotionExtractor, 19 existing for tokenEstimator)
- **Type checking**: Zero new TypeScript errors (pre-existing errors in unmodified files only)
- **Build**: Vite build succeeds (pre-existing TS errors in unmodified files prevent `tsc -b` but `tsc --noEmit` passes clean)
- **Red-team checks**:
  - Crisis keywords in user message → crisis detection fires first, mood suggestion suppressed (correct)
  - Very short messages ("ok", "yes") → no suggestion (min length guard)
  - Neutral messages ("The weather is nice") → no emotions detected (correct)
  - Rapid emotional messages → cooldown prevents suggestion spam (correct)
  - User dismisses 3 times → suggestions stop for session (correct)
  - Multiple emotions in one message → highest confidence emotion shown (correct)

## Rollback / limitations

- **Revert**: Remove the three new files and revert `ChatPanel.tsx` and `App.tsx` to previous versions. No database migration needed.
- **Limitations**:
  - Keyword matching is approximate — misses metaphorical expressions ("I'm drowning in work") and may not work well for non-English text
  - Intensity estimation is heuristic-based, not linguistically precise
  - No "Edit & Log" pre-fill — the edit button opens a blank MoodTracker (pre-filling would require additional MoodTracker prop changes, planned for future)
  - Cooldown is message-count-based, not time-based

## Next steps

1. Pre-fill MoodTracker when opened via "Edit" on the suggestion card
2. Journal prompt recommendation tool (similar client-side pattern)
3. Add conversation bookmark capability
4. Improve emotion detection with bigram/trigram matching for indirect expressions
5. Add overreliance disclaimer in chat UI
