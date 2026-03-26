# Switch to Stock Gemma 2 2B-IT Model + Fix Mood Tracker

**Date:** 2026-03-25
**Branch:** `feat/2026-03-25-stock-model-mood-fixes`
**PR:** https://github.com/Guzzler/QuietNote/pull/13
**Plan:** `docs/daily-plans/2026-03-25-plan.md`

## Summary

Replaced the custom fine-tuned Gemma 2B model with stock Gemma 2 2B-IT from WebLLM's built-in model zoo, and fixed two mood tracker bugs (modal close and save persistence).

## Motivation

The custom fine-tune (`quietnote-gemma-2b-q4f32_1-MLC`) had overfit on a narrow "embarrassment/boundary" distribution:
- Every response fixated on embarrassment regardless of topic
- Produced made-up words ("inconceving", "negaitve", "gratiously")
- Gave unsolicited advice despite system prompt prohibiting it
- Never asked reflective questions despite system prompt requiring them
- Responded to positive messages with lectures about embarrassment

The mood tracker had two bugs making it feel broken: the modal couldn't be closed (X button, backdrop clicks both failed), and the mood count didn't update after saving.

## User Impact

- **Core conversation**: Stock Gemma 2 2B-IT is instruction-tuned and should follow the system prompt (empathy, reflective questions, concise responses). This is the highest-leverage change possible.
- **Mood tracker**: Users can now close the modal normally and see their mood count update immediately after saving.

## Technical Details

### Priority 1: Model Switch (`src/hooks/useMLCEngine.ts`)
- Changed `MODEL_ID` from `quietnote-gemma-2b-q4f32_1-MLC` to `gemma-2-2b-it-q4f32_1-MLC`
- Removed custom `appConfig` with HuggingFace URL and WASM lib — the stock model is in WebLLM's built-in model list
- Updated `MODEL_REF` metadata accordingly

### Priority 1: Generation Parameters (`src/App.tsx`)
- Increased `temperature` from 0.4 to 0.6 — the stock model follows instructions better and benefits from slightly more natural variation
- Increased `maxTokens` from 150 to 200 — allows room for the reflective questions the system prompt requires
- `repetition_penalty: 1.3` kept from 03-24 fix

### Priority 2: Mood Tracker Close (`src/components/MoodTracker.tsx`)
- **Root cause**: Framer Motion v12 `AnimatePresence` with conditional fragments (`{isOpen && <><motion.div/><motion.div/></>}`) was not properly unmounting children when `isOpen` toggled to false. The exit animations never fired, keeping modal elements in the DOM.
- **Fix**: Replaced `AnimatePresence` wrapper with simple conditional rendering (`if (!isOpen) return null`). Changed `motion.div` elements to plain `div` for the backdrop and modal wrapper.
- Added `onClick={onClose}` on the modal wrapper div for click-outside-to-close
- Added `onClick={(e) => e.stopPropagation()}` on the inner content div to prevent closing when clicking inside the modal

### Priority 3: Mood Save (`src/components/MoodTracker.tsx`)
- Made `handleSave` async and added `await onSaveMood(moodEntry)` to ensure IndexedDB write completes before closing
- Added `await listMoods()` + `setAllMoods(updated)` after save to refresh the count immediately
- Updated `onSaveMood` prop type to `(mood: MoodEntry) => void | Promise<void>`

## Safety Review

- **Model switch is safe**: Gemma 2 2B-IT is a well-known instruction-tuned model from Google. All existing guardrails remain unchanged:
  - Crisis detection runs on user INPUT before model (unaffected by model switch)
  - Response guardrails (sanitizeResponse) run on model OUTPUT (still active)
  - Medical refusal few-shot examples are in the system prompt (model should follow better now)
- **MoodTracker changes are pure UI**: No data flow changes, IndexedDB operations unchanged
- **Generation parameter changes are conservative**: temperature 0.6 and maxTokens 200 are moderate values

## Validation

- **TypeScript**: Clean, no errors
- **Tests**: All 295 tests passing
- **Browser verification**:
  - Mood tracker close via X button: ✅
  - Mood tracker close via click-outside: ✅
  - Mood save and count update (1→2): ✅
  - Model inference: Could not test in automated preview (headless Chrome limitation with WebLLM WASM). Needs real-browser verification.

## Live Test Results

### Before (custom fine-tune)
| Input | Response Quality |
|-------|-----------------|
| "I've been feeling really good today, I finished a big project" | Says "work was stressful" (wrong tone), gives unsolicited advice, no questions |

### After (stock Gemma 2 2B-IT)
Model quality cannot be verified until tested in a real browser with WebGPU.

## Rollback

- Revert the commit. Restore `CUSTOM_MODEL_ID`, `CUSTOM_MODEL_URL`, and `appConfig` in `useMLCEngine.ts`
- Restore `AnimatePresence` wrapper in `MoodTracker.tsx`
- Change temperature back to 0.4, maxTokens to 150 in `App.tsx`

## Limitations

- **Model quality unverified in automation**: The preview browser couldn't run WebLLM model inference. Real-browser testing is required to confirm the stock model follows the system prompt.
- **No exit animation on modal**: Removing AnimatePresence means the mood tracker modal appears/disappears instantly instead of animating. This is acceptable for now — a working close button is more important than a smooth animation.
- **Model download size**: The stock Gemma 2 2B model may have a different download size than the custom fine-tune. First-time users may see a longer or shorter initial load.

## Next Steps

1. **Real-browser model testing**: Open the app in Chrome with WebGPU, test 5+ varied prompts, compare quality vs. 3.68/5.0 baseline
2. **Collect eval responses**: Run the eval suite against the new model to get a scored comparison
3. **Re-add modal animation**: Use a simpler animation approach (CSS transitions or a portal-based modal) instead of AnimatePresence
4. **Fix CrisisResources modal**: Same AnimatePresence close bug likely exists — apply same fix
