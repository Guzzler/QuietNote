# Header Subtitle, Mobile Sessions, Interactive Prompt Link

**Date:** 2026-03-29
**Commit:** 564fb9c
**Type:** UX Polish

## Summary
Three small polish items that compound on the 03-28 humanization work: replaced the technical header subtitle, hid the empty sessions sidebar on mobile, and made the welcome card's prompt suggestion interactive.

## Motivation
The 03-28 work humanized the loading screen and welcome card, but once the main UI appeared, technical jargon in the header ("On-device introspective coach (WebLLM)") broke the warm tone. The empty sessions sidebar wasted space on mobile, and the welcome card's prompt suggestion was plain text with no way to act on it.

## User Impact
- Header now says "Private journaling companion" — consistent with loading screen
- Mobile users no longer see an empty "No saved sessions yet" panel
- First-time users can click "journal prompt" in the welcome card to immediately open the PromptSelector

## Technical Details
- `src/App.tsx`: Changed header subtitle string, wrapped SessionsPanel with conditional `hidden lg:block` class
- `src/components/ChatPanel.tsx`: Added `promptSelectorOpen` state, made "journal prompt" text a button that opens PromptSelector
- `src/components/PromptSelector.tsx`: Added `externalOpen` and `onExternalOpenHandled` props for external trigger support

## Safety Review
- No new safety concerns — text changes and conditional CSS only
- Crisis detection, guardrails, and input preservation unaffected

## Validation
- Browser verified on desktop and mobile viewports
- All modals open/close correctly
- PromptSelector flow: click link → selector opens → select prompt → textarea fills
