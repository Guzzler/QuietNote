# Safety & Correctness Fixes — Phase 1

**Date:** 2026-03-31
**Branch:** fix/2026-03-31-safety-correctness-phase1
**Type:** Bug Fix / Code Quality

## Summary
Fix four ship-blocking issues identified in the 2026-03-31 UX evaluation: a race condition in model loading, a state mutation bug in the crisis path, conflicting Vite template CSS, and a typing animation that re-triggers during streaming.

## Motivation
The 2026-03-31 automated UX evaluation identified these as Phase 1 (safety & correctness) priorities. These bugs could cause duplicate model loads, dropped React state updates, visual style conflicts on every button, and unreadable text during AI streaming.

## Changes

### 1. Fix race condition in `useMLCEngine.ts`
- **Problem:** `loadModel` checks `if (engine) return engine` using React state, but the closure captures a stale value. Two concurrent calls could both enter `CreateMLCEngine`.
- **Fix:** Add a `useRef` guard (`loadingRef`) that is set synchronously before the async work begins. The ref is checked at the top of `loadModel` to prevent concurrent loads.

### 2. Fix direct state mutation in crisis path (`App.tsx`)
- **Problem:** `thread.messages.push(...)` mutates the current state object directly, then `setCurrent({ ...current })` does a shallow copy. React may not detect the nested array change.
- **Fix:** Use immutable update pattern — build new messages array with spread, update via `setCurrent` functional updater with full immutable thread/message reconstruction.

### 3. Remove Vite template global button styles (`index.css`)
- **Problem:** Global `button` rule from the Vite starter template sets `background-color: #1a1a1a`, `padding: 0.6em 1.2em`, and `border: 1px solid transparent`. Every Tailwind-styled button must fight these via specificity. The "journal prompt" inline link button inherits box padding.
- **Fix:** Remove the global `button`, `button:hover`, `button:focus` rules and the light-mode `button` override entirely. Also remove the global `h1` and `a` rules that conflict with Tailwind.

### 4. Fix typing animation re-trigger during streaming (`ChatPanel.tsx`)
- **Problem:** The typing animation `useEffect` depends on `[activeThread]`, which changes on every streamed token. The animation resets from character 0 on each token, making text unreadable during inference.
- **Fix:** Only run the typing animation when the last message is finalized (`!last.temp`). During streaming, display the raw content directly without animation.

## Safety Review
- Race condition fix prevents resource leaks (orphaned WebLLM engines)
- State mutation fix prevents dropped crisis messages — critical for user safety
- CSS removal is purely subtractive — only removes conflicting defaults
- Typing animation fix is display-only, no data path changes

## Validation
- TypeScript build passes with no errors
- Visual verification via preview server
