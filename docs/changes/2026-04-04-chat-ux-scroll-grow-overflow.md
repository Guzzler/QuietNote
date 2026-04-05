# Change Description — 2026-04-04 Chat UX: Auto-scroll, Auto-grow, Layout Fix

## Summary
Implemented the three core chat UX improvements planned on 2026-04-03: auto-scroll to latest message, auto-growing textarea, and layout overflow fix.

## Changes

### Auto-scroll chat (`src/components/ChatPanel.tsx`)
- Added `messagesEndRef` pointing to a sentinel `<div>` at the bottom of the message list
- Added `useEffect` that calls `scrollIntoView({ behavior: "smooth" })` whenever messages change, typing animation updates, or busy state changes
- Ensures the latest message is always visible without manual scrolling

### Auto-grow textarea (`src/components/ChatPanel.tsx`)
- Added `textareaRef` to reference the textarea element
- Added `autoResizeTextarea` callback: resets height to `auto`, then sets to `scrollHeight`
- Called on every `onChange` event for immediate feedback
- Added `useEffect` to reset height when `userInput` is cleared (after send)
- Growth is capped by existing `max-h-36` (144px) CSS class

### Layout overflow fix (`src/components/Layout.tsx`)
- Changed `w-[100vw]` to `w-full`
- `100vw` includes scrollbar width, causing horizontal overflow on systems with visible scrollbars
- `w-full` respects the parent container width and avoids overflow

## Tests
- All 295 existing tests pass
- No new TypeScript errors introduced (8 pre-existing errors unchanged)
- Verified via preview snapshots on desktop (1280x800) and mobile (375x812)
