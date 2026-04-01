# QuietNote UX Evaluation — 2026-03-31

Automated product evaluation: tested live app at desktop (1280x800), tablet (768x1024), and mobile (375x812) viewports. Model loading failed in the test environment (no WebGPU), so the error/recovery path and static UI were the primary focus.

---

## Overall Impressions

**Strengths:**
- Clean, warm, approachable design language. The welcome card and humanized copy ("Your thoughts are safe here") feel genuinely inviting for a journaling app.
- Privacy messaging is consistent and well-placed — header subtitle, welcome card, footer, and Privacy Dashboard all reinforce the on-device promise.
- Mood Tracker has a good emotion selection grid with 10 options and a context picker.
- The Privacy Dashboard is comprehensive — storage stats, export, erase, and transparency messaging.

**Areas of Concern:**
- Accessibility is the biggest gap — no dialog roles, no focus traps, no keyboard navigation for modals.
- Several code-level issues (race conditions, state mutations) could cause subtle bugs during real usage.
- The global CSS from the Vite template is fighting Tailwind styles across the app.

---

## Critical Issues

### 1. Race condition in model loading (`useMLCEngine.ts:29-31`)
`loadModel` checks `if (engine) return engine` using React state, but the closure captures a stale value. If called twice before the first resolves (mount + user action), both calls enter `CreateMLCEngine`, and one engine reference is silently discarded. **Fix:** Use a `useRef` to guard in-flight state.

### 2. Direct state mutation in crisis path (`App.tsx:319-329`)
`thread.messages.push(...)` mutates the current state object directly, then `setCurrent({ ...current })` does a shallow copy. React may not detect the nested change. This can cause duplicate messages or dropped updates. **Fix:** Use immutable update pattern (map + spread).

---

## Major Issues

### 3. All modals missing accessibility attributes
**MoodTracker, PrivacyDashboard, CrisisResources** — none have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape key handling, or focus traps. Screen readers cannot identify that a dialog is open. For a mental health app where crisis resources need urgent access, this is a significant gap.

### 4. Vite template global button styles still present (`index.css:41-58`)
Global `button` rule sets `background-color: #1a1a1a`, `padding: 0.6em 1.2em`, and `border: 1px solid transparent`. Every Tailwind-styled button must fight these via specificity. The "journal prompt" inline link button in the welcome card inherits box padding, making it look like a padded button instead of an inline text link. **Fix:** Remove the Vite template button globals entirely.

### 5. Typing animation re-triggers on every streamed token (`ChatPanel.tsx:97-113`)
The `useEffect` depends on `[activeThread]`, which changes on every token during streaming. The animation resets from character 0 on each update, making text unreadable during inference. **Fix:** Only animate once the message is finalized (check `!last.temp`).

### 6. Touch targets below 44px minimum on mobile
- **Header Mood/Privacy buttons**: `px-3 py-1.5` renders at ~36px tall (below WCAG 2.5.5 minimum)
- **MoodSuggestionCard edit/dismiss buttons**: `p-1` with `h-3 w-3` icons = ~20x20px hit areas
- **Modal close (X) buttons**: measured at 19x19px bounding box

### 7. `storage.ts` opens a new DB connection on every operation
Each function calls `openDB()` which opens a fresh `IDBDatabase` connection. During streaming (which calls `putSession` per token), this creates dozens of concurrent connection requests. **Fix:** Memoize with a module-level promise.

### 8. MoodTracker doesn't reset on close without save (`MoodTracker.tsx:97-103`)
When closed via X button or backdrop click, `handleReset` is never called. Next open shows stale emotion/intensity/note values. **Fix:** Call reset in the `onClose` path or use a `useEffect` on `isOpen`.

### 9. Privacy Dashboard "Storage Used" is misleading
`navigator.storage.estimate()` reports total origin usage including the cached AI model (~889MB). With 0 sessions and 0 mood entries, the dashboard shows "889.37 MB Storage Used." This is confusing — users may think their journal data is 889MB. **Fix:** Either subtract model cache size, label it as "Total browser storage (including AI model)", or only show QuietNote data size.

### 10. `loadModel` function not wrapped in `useCallback` (`App.tsx:151-155`)
The `useEffect` mount hook captures a stale closure of `loadModel` because it's recreated every render. Combined with issue #1, this makes the race condition more likely.

---

## Minor Issues

### 11. ChatPanel props typed as `any` (`ChatPanel.tsx:64`)
The entire props destructuring is typed as `any`, losing all TypeScript safety at the App-to-ChatPanel boundary. All types exist in `types.ts`.

### 12. PromptSelector has no click-outside-to-close (`PromptSelector.tsx`)
The dropdown panel has no outside-click or Escape handler. Only way to close is an explicit "Close" button at the bottom. On mobile, the `w-96` (384px) fixed width overflows viewports below ~420px.

### 13. Crisis resources hardcoded to US (`CrisisResources.tsx:13`)
`getCrisisResources("US")` is hardcoded. Non-US users see US-specific hotlines with no indication these are region-specific. Meaningful issue for a mental health app.

### 14. Sessions sidebar hidden on tablet (768px)
The Sessions panel is hidden at tablet width (tested at 768x1024), so there's no way to access saved sessions on tablets. Consider showing a collapsed/drawer version.

### 15. No loading/skeleton state for sessions list
When sessions load from IndexedDB, there's no skeleton or loading indicator — just "No saved sessions yet" which briefly flashes even if sessions exist.

---

## Suggested Improvement Priorities

**Phase 1 — Safety & Correctness (ship-blocking):**
1. Fix race condition in `useMLCEngine` (ref guard)
2. Fix state mutation in crisis path (immutable updates)
3. Remove Vite template global button styles
4. Fix typing animation re-trigger during streaming

**Phase 2 — Accessibility (high impact):**
5. Add `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape handling to all modals
6. Add focus trap to modals
7. Increase touch targets to 44px minimum
8. Add click-outside-to-close for PromptSelector

**Phase 3 — Polish & Reliability:**
9. Memoize IndexedDB connection
10. Fix MoodTracker reset-on-close
11. Fix misleading storage size in Privacy Dashboard
12. Type ChatPanel props properly
13. Add region detection or label for crisis resources

---

*Evaluated by automated scheduled task on 2026-03-31.*
