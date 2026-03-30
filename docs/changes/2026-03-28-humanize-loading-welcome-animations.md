# 2026-03-28: Humanize Loading Screen, Welcome Card, Modal Animations

## Summary
Three UX polish changes that transform the "front door" experience of QuietNote from developer-prototype to product-grade: friendly loading messages, a warm welcome card, and smooth modal animations.

## Motivation
Every user's first experience is either the loading screen (first visit) or the empty chat state (cached visits). Both were bare and technical. A mental health app needs to feel calm and trustworthy from the first second. Additionally, all four modals lost their animations during the 03-25 through 03-27 bug fix sprint, making interactions feel abrupt.

## User Impact
- **Loading screen**: Users now see "Preparing your private journaling space..." instead of `Fetching param cache/model/0082.bin...100%`. The progress bar remains, plus a note that first load takes a few minutes.
- **Welcome card**: New users see a warm greeting with privacy reassurance and feature hints instead of a bare sentence.
- **Modal animations**: All modals now fade in smoothly instead of popping in abruptly. Enter-only animation (no exit animation) to avoid the Framer Motion v12 exit bug.

## Technical Details

### Files Changed
| File | Change |
|---|---|
| `src/App.tsx` | Added `getLoadingMessage()` function, redesigned loading screen with app branding, friendly messages, and first-time note |
| `src/components/ChatPanel.tsx` | Replaced empty-state text with welcome card (heading, 3 icon-bullets, tagline) |
| `src/index.css` | Added `@keyframes` for `modal-backdrop-in`, `modal-content-in`, `dropdown-in` and corresponding `.animate-*` classes |
| `src/components/MoodTracker.tsx` | Added `animate-modal-backdrop` and `animate-modal-content` classes |
| `src/components/CrisisResources.tsx` | Added `animate-modal-backdrop` and `animate-modal-content` classes |
| `src/components/PrivacyDashboard.tsx` | Added `animate-modal-backdrop` and `animate-modal-content` classes |
| `src/components/PromptSelector.tsx` | Added `animate-dropdown` class |

### Approach
- **Loading messages**: Simple progress-range mapping (0-2%, 2-15%, 15-50%, 50-80%, 80-100%) to friendly strings. Thresholds chosen based on typical WebLLM download progress distribution.
- **Welcome card**: Compact design with Lock/Sparkles/Heart icons matching existing design language. Only shows when `!current` (no active session).
- **Modal animations**: Pure CSS `@keyframes` with `animation` shorthand. Enter-only (no exit animation) to avoid re-introducing the stuck-modal bugs from 03-25 through 03-27. 200ms duration for modals, 150ms for dropdown.

## Safety Review
- **CrisisResources**: Animation is a fast 200ms fade-in — no meaningful delay to crisis information display. No exit animation that could prevent closing.
- **No functional changes**: All changes are purely visual/cosmetic. No logic, state management, or data flow changes.
- **No new dependencies**: Uses existing Tailwind + vanilla CSS.

## Validation
- TypeScript: `tsc --noEmit` passes cleanly
- Browser verification (headless Chrome):
  - Welcome card renders with all content
  - All modal animation classes confirmed in DOM
  - All modals open and close correctly (regression test passed)
  - No new console errors
- Loading screen: Code-reviewed (cannot fully test in headless — requires WebGPU/Cache API)

## Rollback
Revert the single commit. No database or storage changes.

## Limitations
- Loading screen friendly messages cannot be tested in headless Chrome (model download fails)
- Exit animations not implemented (intentional — avoids Framer Motion v12 bug)
- Welcome card not tested on mobile viewport in this session

## Next Steps
- Test loading screen in real browser with WebGPU
- Consider adding exit animations via CSS `closing` state if the enter-only approach feels incomplete
- Mobile viewport optimization for welcome card
