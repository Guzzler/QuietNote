# UX Evaluation — 2026-04-02

## Testing Environment
- Preview browser via Claude Preview (desktop 1280x800, mobile 375x812)
- Model load fails in test environment (Cache API / DOMException) — tested error state UX

## Issues Found

### P0 — Critical

#### 1. Send button has no accessible name
**Location:** `ChatPanel.tsx:439-444`
The send button is icon-only (`<Send>` icon) with no `aria-label`. Screen readers announce it as an unlabeled button.
**Fix:** Add `aria-label="Send message"`.

#### 2. Privacy Dashboard "Storage Used" is misleading
**Location:** `PrivacyDashboard.tsx:258-259`, `storage.ts:149-152`
Shows 889 MB with 0 sessions and 0 moods. `navigator.storage.estimate()` reports total origin usage (including the cached ML model weight files). Users will think their journal data is 889 MB.
**Fix:** Separate "Model Cache" from "Your Data" in the storage display, or label it clearly as "Total Browser Storage (including AI model)".

### P1 — High

#### 3. Sessions panel hidden on mobile with no way to access it
**Location:** `App.tsx:634`
When `sessions.length === 0`, the panel gets `hidden lg:block`, but even when sessions exist, mobile layout stacks vertically and the sessions panel appears below the fold with no hamburger menu or tab to reach it.
**Fix:** Add a sessions button in the header (like Mood/Privacy buttons) that scrolls to or reveals the sessions panel on mobile.

#### 4. No "New Session" button
Once a user is in a conversation, there's no way to start a new session without refreshing the page. There's no "New Chat" or "+" button anywhere.
**Fix:** Add a "New Session" button in the header or sessions panel.

### P2 — Medium

#### 5. Header buttons show only icons on small screens but lack aria-labels
**Location:** `App.tsx:584-600`
The Mood and Privacy buttons hide their text labels below `sm` breakpoint (`hidden sm:inline`), but the buttons themselves have no `aria-label` — only a `title` attribute, which screen readers may not announce.
**Fix:** Add `aria-label` to both header buttons.

#### 6. Mood emotion grid too dense on mobile
The 5-column emotion grid (`grid-cols-5`) in MoodTracker puts 10 emotions in a tight grid. On a 375px screen, each button is ~60px wide — functional but cramped.
**Recommendation:** Consider 4 columns on mobile or 3 for better touch targets.

#### 7. Export data has no success feedback
**Location:** `PrivacyDashboard.tsx:82-113`
After clicking "Export All Data", the file downloads but there's no toast or confirmation message. User has to check their downloads folder.
**Recommendation:** Show a brief success message after export completes.

### P3 — Low

#### 8. Footer overlaps bottom of chat on very short viewports
The footer is always visible. On short viewports (< 700px), it takes space from the chat area.

#### 9. Typing animation replays full message on every render
`ChatPanel.tsx:97-113` — the typing effect re-runs the entire last assistant message character by character even when scrolling back and forth. Could be jarring for long messages.

## What Works Well

- **Welcome card** is warm and inviting, with clear guidance
- **Crisis detection** system is comprehensive with appropriate severity levels
- **Modal accessibility** — focus traps, Escape to close, backdrop click to close all work
- **Error recovery** — model load failures restore user input (not lost)
- **Privacy Dashboard** design is thorough and reassuring
- **Mood Tracker** flow is intuitive — progressive disclosure with emotion > intensity > context > note
- **Response guardrails** properly block medical advice
- **Loading screen** has friendly, non-technical status messages
