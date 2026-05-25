# Guided-Mode Persistence + Context Window Bump

**Date:** 2026-05-24
**Branch:** `feat/2026-05-24-guided-mode-persistence-context-bump`

## Summary

Fixes the two fundamental problems that made QuietNote's core journaling loop unusable:
1. Guided modes (Thought Record, Gratitude, Check-In) vanished the moment the user sent their first message
2. The 2048-token context window caused the model to forget early messages after 3-4 exchanges

## What Changed

### Priority 1: Sticky guided-mode banner in active chat

**Problem:** Guide components only rendered inside the `!current` empty-state branch of ChatPanel. As soon as `newSession()` ran, `current` became truthy and the guide unmounted permanently.

**Fix:** Added a `compact?: boolean` prop to all three guide components (ThoughtRecordGuide, GratitudeGuide, CheckInGuide). When `compact` is true, they render as a horizontal single-line banner with inline step indicator and progress dots. ChatPanel now renders this compact banner as a sticky header above the message list whenever `journalingMode !== "freewrite"` and a session is active.

**Files modified:**
- `src/components/ThoughtRecordGuide.tsx` — added compact variant
- `src/components/GratitudeGuide.tsx` — added compact variant
- `src/components/CheckInGuide.tsx` — added compact variant
- `src/components/ChatPanel.tsx` — render compact guide banner in active chat view

### Priority 2: Context window bump

**Problem:** `MODEL_CONTEXT_LIMIT = 2048` with `RESERVED_FOR_GENERATION = 512` and `RESERVED_FOR_SYSTEM = 200` left only 1336 tokens for conversation history (~3-4 exchanges). The docstring still referenced TinyLlama 1.1B.

**Fix:** Updated constants:
- `MODEL_CONTEXT_LIMIT`: 2048 → 4096 (Gemma 2 2B supports 8192; 4096 is conservative)
- `RESERVED_FOR_GENERATION`: 512 → 384 (model gives 2-4 sentence replies)
- `RESERVED_FOR_SYSTEM`: 200 → 600 (realistic for current system prompt size)
- `AVAILABLE_FOR_HISTORY`: 1336 → 3112 tokens (~2.3x increase)
- Updated docstring: removed TinyLlama reference, documented Gemma 2 2B / Gemma 4 E2B

**Files modified:**
- `src/utils/tokenEstimator.ts` — constants and docstring
- `src/utils/__tests__/tokenEstimator.test.ts` — updated bounds and constant references

### Priority 3: Multi-turn coherence regression test

**New file:** `src/utils/__tests__/tokenEstimator.multiTurn.test.ts`
- Verifies a full 5-step Thought Record exchange (10 messages + realistic system prompt) is retained without trimming
- Verifies graceful trimming when conversation genuinely exceeds budget

## Tests

- All 919+ existing tests pass
- 2 new multi-turn scenario tests added and passing
- Constants test updated to use exported `RESERVED_FOR_SYSTEM` instead of hardcoded 200

## Verification

- Verified Thought Record mode shows "Step 1 of 5" in empty state
- Verified step advances to "Step 2 of 5" after user input
- Verified Free Write mode shows no guide (regression check)
- Full model-load testing blocked by no-GPU environment; compact banner tested via snapshot

## Next Steps

- Real-device testing with GPU to verify model coherence over longer conversations
- Response quality evaluation (Problem 3 from roadmap)
