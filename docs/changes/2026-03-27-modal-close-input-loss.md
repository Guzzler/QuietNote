# Fix PromptSelector/PrivacyDashboard Close Bugs and Input Loss

**Date:** 2026-03-27
**Branch:** `feat/2026-03-27-fix-modal-close-input-loss`
**Plan:** `docs/daily-plans/2026-03-27-plan.md`

## Summary

Fixed the last two AnimatePresence exit bugs (PromptSelector and PrivacyDashboard) and fixed silent input loss when the model fails to load. All five major UI panels now close reliably.

## Motivation

Two of five major UI panels (PromptSelector dropdown and PrivacyDashboard modal) couldn't be dismissed after opening. This created a "nothing closes" feeling where users would have multiple panels stuck on screen simultaneously. Additionally, when users clicked Send with a failed model, their journal entry was silently cleared — unacceptable for a mental health app where users share vulnerable content.

## User Impact

- **PromptSelector**: Close button, Use This button, and toggle all properly dismiss the dropdown
- **PrivacyDashboard**: X button, footer Close button, and click-outside all properly dismiss the modal
- **Input preservation**: When the model fails to load, the user's typed message stays in the textarea instead of being silently lost

## Technical Details

### Priority 1: PromptSelector Fix (`PromptSelector.tsx`)
- Replaced outer `<AnimatePresence>{isOpen && <motion.div>}` with `{isOpen && <div>}`
- Changed outer `motion.div` to plain `div` (kept all styling)
- Kept inner `<AnimatePresence mode="wait">` for prompt content transitions (keyed children work correctly)

### Priority 2: PrivacyDashboard Fix (`PrivacyDashboard.tsx`)
- Replaced `<AnimatePresence>{isOpen && <>...}` with `if (!isOpen) return null` early return
- Changed backdrop and modal `motion.div` to plain `div`
- Added `onClick={onClose}` on modal wrapper for click-outside-to-close
- Added `onClick={(e) => e.stopPropagation()}` on inner content container
- Kept inner `<AnimatePresence>` for delete confirmation toggle

### Priority 3: Input Loss Fix (`App.tsx`, `ChatPanel.tsx`)
- `ChatPanel.tsx`: Moved `setUserInput("")` before the async calls (clears optimistically)
- `App.tsx newSession()`: Added `setUserInput(firstMessage)` to the `if (!e) return` path
- `App.tsx replyInThread()`: Added `setUserInput(text)` to the `if (!e) return` path
- Both null-return paths now restore user input, matching existing catch block behavior

## Safety Review

- **PromptSelector fix is safe**: Pure rendering change, no logic changes. Same proven pattern from MoodTracker (03-25) and CrisisResources (03-26).
- **PrivacyDashboard fix is safe**: Pure rendering change. Inner delete confirmation animation preserved. Click-outside-to-close is standard UX.
- **Input restoration is safe**: Only adds restoration on failure paths. Successful sends still clear input normally. No data loss possible.
- **No guardrail changes**: All crisis detection, response sanitization, and medical refusal logic unchanged.

## Validation

- **TypeScript**: Clean, no errors
- **Tests**: All 295 tests passing
- **Browser verification**: All 3 fixes confirmed working via snapshot and JS verification
  - PromptSelector: dropdown removed from DOM on Close
  - PrivacyDashboard: modal removed from DOM on X, footer Close, and click-outside
  - Input preserved in textarea after model load failure
- **No regressions**: Error banner, mood tracker, sessions panel all unaffected

## Live Test Results

See `docs/evals/live-test-2026-03-27.md` for full test log.

Key findings:
- Pre-fix: Both PromptSelector and PrivacyDashboard stuck in DOM after close attempts
- Post-fix: All close interactions work, DOM nodes properly removed
- Input preservation confirmed: textarea retains user text after failed send

## Rollback

Revert the commit. Changes in 4 source files only.

## Limitations

- **No entry/exit animations**: Same trade-off as MoodTracker and CrisisResources — working close button is more important than animation. All four panels now use the same pattern.
- **Screenshots not captured**: Headless Chrome renderer timed out on screenshot capture. Verification done via accessibility tree snapshots and JS DOM queries.
- **Model inference not tested**: Headless Chrome can't run WebLLM. Input restoration tested with real failure scenario.

## Next Steps

1. Re-add modal animations using CSS transitions instead of Framer Motion AnimatePresence (all 4 panels)
2. Test model inference in real browser with WebGPU
3. Improve loading screen UX
4. Conversation summarization feature
