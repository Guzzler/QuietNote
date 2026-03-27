# Error Handling for Model Load Failure + CrisisResources Fix + Prompt Overlap Fix

**Date:** 2026-03-26
**Branch:** `feat/2026-03-26-error-handling-crisis-fix`
**Plan:** `docs/daily-plans/2026-03-26-plan.md`

## Summary

Added error handling when the on-device model fails to load, fixed the CrisisResources modal close bug (same AnimatePresence issue as MoodTracker), and fixed the Prompt button click area overlapping the Send button.

## Motivation

The core journaling interaction was broken: when the model failed to load, the user's message was silently lost with zero feedback. No error message, no loading indicator after the initial screen, no way to retry. For a mental health app, losing a user's vulnerable journal entry is the worst possible UX failure. Additionally, the CrisisResources modal had the same AnimatePresence close bug fixed in MoodTracker on 03-25 — a safety issue since users in crisis couldn't close the resources modal.

## User Impact

- **Error handling:** Users now see a clear error message ("Something went wrong loading the model. Please try again.") with a Retry button when model loading fails. Their typed message is preserved — never silently lost.
- **CrisisResources:** Users can now close the crisis resources modal via X button, Close button, or clicking outside. Previously the modal was stuck open.
- **Prompt overlap:** The Prompt selector dropdown now opens upward instead of downward, eliminating overlap with the Send button area.

## Technical Details

### Priority 1: Error Handling (`useMLCEngine.ts`, `App.tsx`, `ChatPanel.tsx`)

**useMLCEngine.ts:**
- Added `error` state and `clearError` function
- Added `catch` block in `loadModel()` that maps technical errors to user-friendly messages:
  - Memory/OOM errors → "Not enough memory..."
  - Network/fetch errors → "Could not download the model..."
  - WASM/compile errors → "Your browser couldn't compile..."
  - Other errors → generic "Something went wrong..."
- Returns `error` and `clearError` from the hook

**App.tsx:**
- `newSession()`: Moved `loadModel()` call before session creation. If it returns null, returns early — no session created, no input cleared.
- `newSession()` catch block: On inference failure, removes the failed session, restores user input to textarea.
- `replyInThread()`: Added null check after `loadModel()`. Catch block removes failed messages and restores user input.
- Passes `modelError`, `clearModelError`, and `onRetryLoad` to ChatPanel.

**ChatPanel.tsx:**
- Added error banner UI above input area showing the error message with a Retry button.
- Added `stopPropagation` on Send button click to prevent event bubbling.

### Priority 2: CrisisResources Fix (`CrisisResources.tsx`)
- Replaced `AnimatePresence` + `{isOpen && <><motion.div/>...}` pattern with `if (!isOpen) return null`
- Changed `motion.div` elements to plain `div` for backdrop and modal wrapper
- Added `onClick={onClose}` on modal wrapper for click-outside-to-close
- Added `onClick={(e) => e.stopPropagation()}` on inner content to prevent close when clicking inside
- Removed `framer-motion` import (no longer needed)

### Priority 3: Prompt Overlap Fix (`PromptSelector.tsx`)
- Changed dropdown positioning from `top-full mt-2` to `bottom-full mb-2` (opens upward instead of downward)
- Updated animation direction to match (y: 10 instead of y: -10)

## Safety Review

- **Error handling is safe**: No data loss — user input is always preserved on failure. No new data flows introduced.
- **CrisisResources fix is safe**: Same proven pattern as MoodTracker fix from 03-25. Modal appears instantly (no entry animation) which is appropriate for crisis contexts — immediacy over aesthetics.
- **Prompt fix is safe**: Pure CSS positioning change, no logic changes.
- **No guardrail changes**: All existing crisis detection, response sanitization, and medical refusal logic unchanged.

## Validation

- **TypeScript:** Clean, no errors
- **Tests:** All 295 tests passing
- **Browser verification:**
  - Error banner appears on model load failure with retry button
  - User input preserved when send fails (not lost)
  - No empty sessions created on failure
  - Mood tracker still opens and closes correctly
  - Prompt dropdown opens upward, no overlap with send button
  - Console errors properly logged (no unhandled rejections)

## Live Test Results

See `docs/evals/live-test-2026-03-26.md` for full test log.

Key findings:
- Error handling works end-to-end: loading screen → error → banner with retry
- Input preservation confirmed: typed message stays in textarea after failed send
- CrisisResources fix verified via code review (same pattern as MoodTracker)
- Prompt dropdown confirmed opening upward with no send button overlap

## Rollback

Revert the commit. All changes are in 4 source files + the hook.

## Limitations

- **CrisisResources close not tested live**: Cannot trigger crisis detection in headless browser without model inference. Fix verified via code review (identical pattern to MoodTracker).
- **Model inference not tested**: Headless Chrome can't run WebLLM. Error handling verified with real failure scenario.
- **PromptSelector exit animation broken**: Pre-existing AnimatePresence exit bug also affects the Prompt dropdown. Not addressed today — will need same fix pattern applied to PromptSelector in a future PR.
- **No entry/exit animations on CrisisResources**: Same trade-off as MoodTracker — working close button is more important than animation.

## Next Steps

1. Fix PromptSelector AnimatePresence exit bug (same pattern)
2. Test model inference in real browser with WebGPU
3. Improve loading screen UX (show download progress more clearly)
4. Re-add modal animations using CSS transitions instead of Framer Motion AnimatePresence
