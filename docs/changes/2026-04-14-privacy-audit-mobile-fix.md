# 2026-04-14 — Privacy Audit Checklist + PromptSelector Mobile Fix

## Summary
Fixed the PromptSelector mobile overflow issue (UX #20) and created a formal privacy audit checklist document to complete Phase 4 of the local inference runtime design plan.

## What Changed

### PromptSelector Mobile Overflow Fix
- **`src/components/ChatPanel.tsx`**: Wrapped `JournalingModeSelector` in a `min-w-0 flex-1` container so it shrinks on narrow screens instead of pushing the Prompt button off-screen.
- **`src/components/PromptSelector.tsx`**: Changed dropdown width from viewport-relative (`w-[calc(100vw-2rem)] max-w-96`) to fixed responsive sizes (`w-80 sm:w-96 max-w-[calc(100vw-2rem)]`). Added `overflow-y-auto max-h-[60vh]` for vertical content scrolling.

### Privacy Audit Checklist
- **`docs/privacy-audit-checklist.md`**: New document with structured sections covering:
  1. Data flow inventory (what's collected, where it's stored, what leaves the device)
  2. Network verification procedures (using the Network Audit utility)
  3. Storage verification (IndexedDB inspection, export/erase verification)
  4. Code audit pointers (which files handle network, user data, system prompts)
  5. Ongoing verification guidelines (after code changes, dependency updates)
  6. Privacy claim verification summary

## Why
- The PromptSelector dropdown was the last medium-priority UX bug (#20). The viewport-relative width could cause horizontal overflow on narrow mobile screens.
- The privacy audit checklist completes Phase 4 (Verification & Privacy Audit) of the design doc. The tooling half (network audit utility + privacy-after-load tests) was done in PR #31; this document is the process half.

## Technical Details
- The `min-w-0` fix addresses a common flexbox issue where items with `overflow-x-auto` don't shrink below their content width due to `min-width: auto` default.
- The dropdown now uses `w-80` (320px) on mobile and `sm:w-96` (384px) on desktop, with `max-w-[calc(100vw-2rem)]` as a safety clamp.
- All file paths referenced in the audit checklist have been verified to exist in the codebase.

## Tests
- All 376 existing tests pass
- Production build succeeds with zero TypeScript errors
- Visual verification at mobile (375px) and desktop (1280px) viewports

## Screenshots
- `docs/screenshots/2026-04-14/prompt-selector-mobile-375px.png`
- `docs/screenshots/2026-04-14/prompt-selector-desktop.png`

## Next Steps
- Phase 4 is now complete
- Transformers.js v4 was already at the latest version (4.0.1) — no upgrade needed
- Remaining UX issues: #8 (footer overlap, low), #27 (session titles, low), #28 (context trimming notice, low)
