# Mood-Aware Prompt Suggestions & Weekly Reflection

## Summary
Bridges mood tracking and journaling by suggesting relevant journal prompts after mood logging, and adding a weekly reflection entry point to the wellness summary.

## What Changed

### 1. Mood-Aware Prompt Suggestions (Priority 1)
- **New utility**: `src/utils/moodPromptMapper.ts` — maps each of 10 emotions to 2 relevant prompt categories (e.g., anxious → challenges + self-reflection, happy → gratitude + growth)
- **Post-save UI in MoodTracker**: After saving a mood (when no active session), shows 2-3 contextually relevant journal prompts with animated cards
- **Prompt-to-chat flow**: Clicking a suggested prompt closes the modal, switches to Free Write mode, and pre-fills the chat input
- **"Not now" dismiss**: Users can skip prompt suggestions and close normally
- **Suppressed during active sessions**: Prompt suggestions only appear when starting fresh, not mid-conversation

### 2. Weekly Reflection Entry Point (Priority 2)
- **"Reflect on your week" button** in WellnessSummary (visible with 5+ moods)
- Generates a personalized reflection prompt using actual mood data:
  - Mood trend direction (improving/stable/declining)
  - Top emotion from the period
  - Tailored reflection question matching the trend
- Clicking the button closes MoodTracker and pre-fills the chat input with the personalized prompt

### 3. Emotion-to-Prompt Utility (Priority 3)
- `getMoodAwarePrompts(emotion, count)` is reusable for future features like mood-aware welcome prompts
- Full test coverage: all 10 emotions mapped, correct categories, no duplicates, edge cases

## Technical Details
- **Files created**: `src/utils/moodPromptMapper.ts`, `src/utils/__tests__/moodPromptMapper.test.ts`
- **Files modified**: `src/components/MoodTracker.tsx`, `src/components/WellnessSummary.tsx`, `src/App.tsx`
- New props on MoodTracker: `onUsePromptFromMood`, `hasActiveSession`, `onStartReflection`
- New prop on WellnessSummary: `onStartReflection`

## Tests
- 16 new tests in `moodPromptMapper.test.ts` covering all 10 emotions, correct categories, count limits, and no duplicates
- All 854 tests passing (up from 838)
- Build passes cleanly

## Screenshots
- Post-save mood-aware prompts (anxious)
- Prompt pre-filled in chat input
- Weekly reflection button in WellnessSummary
