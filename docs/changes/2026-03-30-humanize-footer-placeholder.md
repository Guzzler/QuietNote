# Humanize Footer Text and Textarea Placeholder

**Date:** 2026-03-30
**Commit:** 4330d8f
**Type:** UX Polish

## Summary
Replaced the last two pieces of technical-facing text in the visible UI: the footer and textarea placeholder. This completes the tone consistency sweep started on 03-28.

## Motivation
After the 03-28 and 03-29 humanization work, the loading screen, header, and welcome card all speak user-friendly language. But the footer still said "All inference on-device • Sessions stored locally" (developer jargon) and the textarea placeholder said "Write your journal entry..." (formal/clinical). These small inconsistencies undermined the warm, trustworthy tone established elsewhere.

## User Impact
- Footer now says "Quietnote • Your data never leaves this device" — clear trust language
- Textarea placeholder now says "What's on your mind?" — warm conversation starter instead of a form label
- The entire visible UI now speaks the same human, empathetic language

## Technical Details
- `src/App.tsx` line ~639: Footer text changed from "Quietnote • All inference on-device • Sessions stored locally" to "Quietnote • Your data never leaves this device"
- `src/components/ChatPanel.tsx` line ~436: Placeholder changed from "Write your journal entry..." to "What's on your mind?"

## Safety Review
- No safety concerns — string-only changes
- Shorter footer text is actually better for mobile (less overflow risk)

## Validation
- Browser verified on desktop (1280x800) and mobile (375x812)
- Footer fits cleanly on both viewports
- Placeholder visible and disappears on input
- No console errors beyond expected headless Chrome limitations
- All existing features (modals, prompt selector, welcome card) still working
