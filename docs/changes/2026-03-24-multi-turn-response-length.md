# Fix Multi-Turn Repetition + Response Length + Guardrail Logging

**Date:** 2026-03-24
**Branch:** `fix/2026-03-24-multi-turn-response-length`
**PR:** https://github.com/Guzzler/QuietNote/pull/12
**Plan:** `docs/daily-plans/2026-03-24-plan.md`

## Summary

Fixed the three most visible quality issues in the app: (1) multi-turn conversations repeating or degenerating into gibberish due to WebLLM KV cache corruption, (2) responses running far too long (7+ sentences, hundreds of words), and (3) guardrail console logging showing `[object Object]` instead of readable details.

## Motivation

During live testing, the model produced a 7+ sentence rambling lecture about embarrassment (repeating itself three times) in response to a simple anxiety journal entry, then gave an almost identical response on the second turn that degenerated into complete gibberish ("hana represenation", "pòvidegos lorensi", "sii sii sii..."). This made the core conversation experience — the product's primary feature — completely broken.

## User Impact

- **Multi-turn works**: Users can now have multi-turn conversations without the model repeating its first response or degenerating into nonsensical text
- **Shorter responses**: Responses are bounded to ~100 words instead of running for hundreds of words of gibberish
- **No visible UX changes**: The fixes are all under the hood — same UI, same flow

## Technical Details

### Priority 1: Fix Multi-Turn Repetition (`src/App.tsx`)
- Added `await e.resetChat()` before every `e.chat.completions.create()` call
- This clears WebLLM's internal KV cache, forcing the engine to process the full messages array from scratch each turn
- Applied to both `newSession()` and `replyInThread()` code paths
- **Root cause**: WebLLM's conversation-matching heuristic was failing, causing the engine to append to stale cached state instead of processing our messages array

### Priority 2: Enforce Response Length (`src/App.tsx`)
- Reduced `maxTokens` from 512 to 150 (~112 words ≈ 4-5 sentences)
- Added `repetition_penalty: 1.3` to both generation calls to discourage repetitive phrasing
- Lowered `temperature` from 0.5 to 0.4 for tighter instruction following
- Applied to both `newSession()` and `replyInThread()` code paths

### Priority 3: Fix Guardrail Console Logging (`src/App.tsx`)
- Changed `console.warn("[Guardrails]", guardrailResult.warnings)` to serialize each warning object as JSON
- New format: `[Guardrails] Warnings: {"type":"too_long","detail":"Response is 180 words (max 150)"}, ...`
- Applied to both `newSession()` and `replyInThread()` guardrail logging

## Safety Review

- **resetChat() is safe**: It only clears the KV cache. The system prompt and conversation history are always included in the messages array passed to `create()`, so nothing is lost.
- **maxTokens reduction**: 150 tokens may occasionally cut off a reflective question. `truncateToLastSentence()` ensures no mid-word cutoffs. If testing shows this is too restrictive, can increase to 180-200.
- **repetition_penalty**: 1.3 is a moderate value. Too high (>1.5) can cause incoherent output; 1.3 is within the recommended range.
- **No behavioral risk**: These are parameter-only changes affecting generation quality, not safety logic. All guardrail checks remain intact.

## Validation

- **TypeScript**: Clean, no errors
- **Tests**: All 295 tests passing
- **Browser verification**: 3-turn conversation tested:
  - Turn 1: ~6 sentences, coherent (shorter than pre-change 7+)
  - Turn 2: Different content from turn 1 (no verbatim repetition), no gibberish
  - Turn 3: Also different, no degeneration — multi-turn KV cache fix confirmed

## Live Test Results

### Before
| Turn | Result |
|------|--------|
| 1 | 7+ sentences, repetitive embarrassment lecture |
| 2 | Nearly identical to turn 1, then degenerates into "hana represenation" / "pòvidegos lorensi" / "sii sii sii..." for hundreds of words |

### After
| Turn | Result |
|------|--------|
| 1 | ~6 sentences, coherent response about work stress |
| 2 | Different wording from turn 1, no gibberish, ~100 words |
| 3 | Also different, no degeneration, bounded length |

## Rollback

- Revert the commit. The only changes are in `src/App.tsx`:
  - Remove `resetChat()` calls to restore previous KV cache behavior
  - Change `maxTokens` back to 512, `temperature` to 0.5, remove `repetition_penalty`
  - Revert guardrail logging format

## Limitations

- **Model quality**: The fine-tuned Gemma 2B model is still fixated on "embarrassment" regardless of topic, doesn't address follow-up questions, and produces made-up words. These are model-level issues that can't be fixed with generation parameters.
- **Latency**: `resetChat()` means the engine re-processes the full conversation each turn. For a 2048-token context window this adds minimal latency, but it's worth monitoring as conversations grow.

## Next Steps

1. **Model comparison**: A/B test current Gemma 2B vs Gemma 2 2B candidate — the model quality issues are the #1 remaining blocker
2. **Real response collection**: Now that multi-turn works, collect real model responses for the eval suite
3. **Guardrail logging verification**: Confirm JSON output format when a response triggers warnings
