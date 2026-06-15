# 2026-06-14 — Day 13: Privacy signal consolidation (Track A3)

**PR:** #60 — `feat/2026-06-14-privacy-consolidation` → `main`
**Roadmap item:** Track A — **A3. Privacy signal consolidation** (med, ≤1 day). Fundamental Problem 4 ("feels like a tech demo, not a journal").

## Summary

QuietNote was asserting "this is private" in several surfaces at once — a dedicated header **Privacy** (Shield) nav button, the loading screen, and the footer. A journal a person trusts does not keep reminding them it is trustworthy; the repetition reads as a *tech demo proving a point*. This change converges the privacy story onto **one persistent, subtle indicator** (the footer) and **one entry point to the data controls** (inside Settings), removing the redundant top-level Privacy nav button — without weakening anything: export/erase stays 100% reachable.

## What changed and why

1. **Removed the header Privacy (Shield) nav button** (`src/App.tsx`). It was the redundant top-level privacy entry point. The `Settings` gear is now the single right-side utility entry. Dropped the now-unused `Shield` import from `App.tsx` (TS strict).
2. **Relocated the entry point into Settings** (`src/components/SettingsPanel.tsx`). Added an `onOpenPrivacy: () => void` prop and a new **"Privacy & your data"** row below the personality controls (Shield icon + "Export or erase your entries" hint + chevron). It is a real `<button>` with `aria-label="Open privacy and data controls"`, `min-h-[44px]` tap target, inside the existing focus trap, matching the modal's quiet idiom.
3. **Wired the handoff in `App.tsx`**: `onOpenPrivacy={() => { setShowSettings(false); setShowPrivacyDashboard(true); }}` — close Settings, then open Privacy, so the two modals don't stack. `PrivacyDashboard` stays mounted exactly as before; **export/erase behavior is verbatim**.
4. **Converged the footer into the single persistent indicator** (`src/App.tsx`): added an inline `Lock` icon (`h-3 w-3 text-slate-400`) before the line, which now reads `Quietnote — your journal entries stay on this device` (em-dash; UTF-8 clean, no mojibake). `Lock` was already imported.

### Loading screen — NO change (decision recorded)

The loading screen was intentionally left untouched:
- The `Lock` note ("First time takes a few minutes. After that, it loads instantly.") is **download-timing info**, honest and useful — not a privacy claim.
- The "Your private journaling companion" subtitle is **brand framing**, not a duplicated reassurance.
- A3's "remove the duplicated reassurances from welcome card and loading screen" was already satisfied for the welcome card by A1 (privacy bullets removed, guarded by `WelcomeEmptyState.test.ts`).

## Technical details

- `src/App.tsx`: removed Shield import + header Privacy button; added `onOpenPrivacy` to `<SettingsPanel>`; footer now flex row with inline `Lock`.
- `src/components/SettingsPanel.tsx`: new `onOpenPrivacy` prop; new "Privacy & your data" section (Shield + ChevronRight imports added).
- `PrivacyDashboard` mount/render block and its props are unchanged.

## Tests written

`src/components/__tests__/PrivacyConsolidationGuards.test.ts` (source-level guards, established read-source-as-text pattern):
- `App.tsx` no longer contains `aria-label="Privacy dashboard"` (header button gone).
- `SettingsPanel.tsx` references `onOpenPrivacy` and renders the "Privacy & your data" affordance + ARIA label.
- `App.tsx` passes `onOpenPrivacy` and still renders `<PrivacyDashboard` (reachable).
- Footer carries the `Lock` icon and the "stay on this device" copy.

**Suite:** `npm run build` green; `npm run test` **1092/1092 passing** (incl. the new guard). Regression guards held: `WelcomeEmptyState.test.ts`, `VisualCalmGuards.test.ts`, disclaimer copy.

**Freeze gate:** `git diff origin/main -- src/utils/evalRunner.ts src/utils/evalScorer.ts src/prompts/` is EMPTY. No edits to `crisisDetection.ts`, `responseGuardrails.ts`, `conversationContext.ts`, `responseShaping.ts`, the disclaimer copy, or `CrisisResources.tsx`. **UI-only day — no model surface, no eval run, no north-star rows (Hard Rule 1 trivially satisfied).**

## Screenshots

Captured with Playwright (the preview screenshot tool timed out under the WebGPU model-load retry loop in this environment). Stored under `docs/screenshots/2026-06-14/`.

**Before**
- `01-before-header-desktop.png` — header with Mood / Settings / **Privacy**
- `02-before-header-mobile.png`
- `03-before-settings-modal-desktop.png` — Settings with no privacy section
- `04-before-footer-desktop.png` — footer without lock icon

**After**
- `05-after-header-desktop.png` — header with only Mood / Settings (no Privacy); footer lock visible
- `06-after-header-mobile.png`
- `07-after-settings-modal-desktop.png` — "Privacy & your data" row visible
- `08-after-privacy-dashboard-from-settings.png` — dashboard opened via the new Settings entry (reachability proven)
- `09-after-footer-desktop.png` — footer with lock icon

## Next steps

Track A committed items remaining: **A4** (inline mood check, med) and **A5** (sidebar previews, low). Per ROADMAP sequencing, after A3–A5 the planner pivots to **C1** (long-conversation harness). A2 day-2 off-path accent sweep remains optional filler if a future screenshot pass shows it jarring.
