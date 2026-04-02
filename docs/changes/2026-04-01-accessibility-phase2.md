# Change Description — 2026-04-01 Accessibility Phase 2

## Summary
Added comprehensive accessibility support to all modal dialogs and the PromptSelector dropdown, addressing Phase 2 issues from the 2026-03-31 UX evaluation.

## Changes

### New: `useFocusTrap` hook (`src/hooks/useFocusTrap.ts`)
- Reusable hook that traps keyboard focus within a container when active
- Cycles Tab/Shift+Tab through focusable elements
- Auto-focuses first focusable element on open
- Restores focus to previously focused element on close

### MoodTracker (`src/components/MoodTracker.tsx`)
- Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linking to title
- Added focus trap via `useFocusTrap`
- Added Escape key to close
- Added `aria-label` to close button
- Increased close button touch target to 44px minimum
- **Fixed:** Modal now resets state (emotion, intensity, contexts, note) when closed without saving

### PrivacyDashboard (`src/components/PrivacyDashboard.tsx`)
- Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linking to title
- Added focus trap via `useFocusTrap`
- Added Escape key to close
- Added `aria-label` to close button
- Increased close button touch target to 44px minimum
- Simplified modal wrapper (removed unnecessary nested div)

### CrisisResources (`src/components/CrisisResources.tsx`)
- Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linking to title
- Added focus trap via `useFocusTrap`
- Added Escape key to close
- Added `aria-label` to close button
- Increased close button touch target to 44px minimum

### PromptSelector (`src/components/PromptSelector.tsx`)
- Added click-outside-to-close via `mousedown` listener
- Added Escape key to close
- Changed dropdown width from fixed `w-96` to responsive `w-[calc(100vw-2rem)] max-w-96` to prevent mobile overflow

### Header buttons (`src/App.tsx`)
- Increased Mood and Privacy button touch targets from ~36px to 44px minimum (`py-2.5` + `min-h-[44px]`)

### MoodSuggestionCard (`src/components/MoodSuggestionCard.tsx`)
- Increased edit/dismiss button touch targets from ~20px to 44px minimum
- Slightly increased icon sizes for better visibility

## Evaluation Issues Addressed
- Issue #3: All modals missing accessibility attributes
- Issue #6: Touch targets below 44px minimum on mobile
- Issue #8: MoodTracker doesn't reset on close without save
- Issue #12: PromptSelector has no click-outside-to-close

## Verified
- Accessibility tree confirms `dialog` role and `aria-labelledby` on MoodTracker and PrivacyDashboard
- Focus trap activates on modal open
- Escape key closes all modals
- TypeScript compilation passes (no new errors)
- Build succeeds (all errors are pre-existing)
