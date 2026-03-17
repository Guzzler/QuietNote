# Model Identity Fix, Mood Insights Card, System Prompt Evaluation

## Summary

Fixed the model identity discrepancy between App.tsx and useMLCEngine.ts, built a mood insights card that surfaces mood patterns in the MoodTracker modal, and created a comprehensive system prompt evaluation framework.

## Motivation

- **Model identity**: App.tsx stored a stale TinyLlama 1.1B reference in session metadata while useMLCEngine.ts actually loads Gemma 2B. This meant session data was lying about which model generated responses — a transparency problem flagged since Day 1.
- **Mood insights**: The moodPatterns.ts utility (built Day 4) had no UI surface. Users could log moods but never see trends, correlations, or patterns. This completes the mood tracking feedback loop: log -> analyze -> reflect.
- **System prompt evaluation**: The system prompt has never been formally evaluated for instruction-following consistency with the actual deployed Gemma 2B model. For a mental health app, unknown compliance rates are a safety concern.

## User Impact

- Session metadata now accurately reflects Gemma 2B (the model actually used)
- Users with 5+ mood entries see a collapsible "Your Patterns" section inside the MoodTracker with trend indicators, top emotions, correlations, day-of-week patterns, and insights
- Users with fewer than 5 entries see a gate message encouraging more logging
- All insight text uses observational language with a non-clinical disclaimer

## Technical Details

### Priority 1: Model Identity Fix
- **`src/hooks/useMLCEngine.ts`**: Exported `MODEL_REF` constant as single source of truth for model identity
- **`src/App.tsx`**: Replaced hardcoded TinyLlama ModelRef with imported `MODEL_REF` from useMLCEngine

### Priority 2: Mood Insights Card
- **`src/components/MoodInsightsCard.tsx`** (new): Collapsible card component that:
  - Gates on MIN_ENTRIES_FOR_PATTERNS (5 entries)
  - Shows trend indicator (improving/stable/declining) with color coding
  - Displays top 3 emotions with visual bar chart
  - Lists emotion-context correlations and day-of-week patterns
  - Renders weekly report insights
  - Includes "Based on your mood logs. This is not a clinical assessment." disclaimer
  - Uses Framer Motion for expand/collapse animation
- **`src/components/MoodTracker.tsx`**: Integrated MoodInsightsCard, loads moods from IndexedDB when modal opens

### Priority 3: System Prompt Evaluation
- **`docs/evals/system-prompt-eval.md`** (new): Comprehensive evaluation framework with:
  - 25 test prompts across 6 dimensions (persona, medical refusal, jailbreak, format, empathy, boundaries)
  - Grading rubric (pass/partial/fail)
  - Known limitations of small models documented
  - Recommended mitigations for common failure modes
  - System prompt improvement candidates

## Safety Review

- **Model identity fix**: Metadata-only change. No change to model loading or inference behavior. Old sessions retain their original (historically accurate) metadata.
- **Mood insights card**: Read-only display of existing data. All text uses observational language ("You logged..."), never diagnostic ("You have..."). Declining trends include supportive language. Non-clinical disclaimer always visible.
- **System prompt eval**: Documentation only. No runtime changes. Candidates for prompt improvement are documented but not applied without evaluation.

## Validation

- **TypeScript**: Zero errors (`tsc --noEmit` clean)
- **Tests**: 173 tests passing (no regressions)
- **Browser**: App loads without errors, MoodTracker modal renders MoodInsightsCard correctly with gate message (0 moods logged), zero console errors

## Rollback / Limitations

- **Revert model fix**: Revert App.tsx to hardcoded ModelRef
- **Revert insights card**: Remove MoodInsightsCard.tsx and imports from MoodTracker.tsx
- **Limitations**: System prompt eval is a framework only — actual test results require manual testing with the loaded model. Mood insights require 5+ entries to display patterns.

## Next Steps

1. Conduct manual system prompt evaluation session and record results
2. Apply system prompt improvements based on evaluation findings
3. Consider adding client-side output filters if eval reveals safety gaps
4. Build automated eval runner for CI (mock-based)
