# Network Audit Utility + Keyboard Shortcut Hints — 2026-04-13

## Summary

Added Phase 4 verification tooling: a development-mode network audit utility that proves no user data leaves the device after model download, keyboard shortcut hints for improved discoverability, and privacy-after-load integration tests.

## What was changed and why

### Network Audit Utility (Priority 1 — Phase 4 Verification)
- Created `src/utils/networkAudit.ts` — intercepts `fetch`, `XMLHttpRequest`, `sendBeacon`, and `WebSocket` to log all outbound requests
- Added Network Audit section to Privacy Dashboard (dev mode only) with Start/Stop toggle and color-coded request log (green = expected model downloads, red = unexpected)
- Tree-shaken from production builds — verified not present in dist output
- This is the core Phase 4 deliverable: developers can now verify the no-network-after-load privacy claim

### Keyboard Shortcut Hints (Priority 2 — UX Issue #22)
- ChatPanel: "Enter to send · Shift+Enter for new line" shown when textarea is focused
- Privacy Dashboard: "Esc" hint next to close button
- Mood Tracker: "Esc" hint next to close button
- All hints hidden on mobile (< sm breakpoint) to save space

### Privacy-After-Load Integration Test (Priority 3 — CI Verification)
- Created `src/inference/__tests__/privacy-after-load.test.ts`
- Verifies that after WebLLM engine is loaded, calling `generate()` triggers zero network requests
- Complements the dev-mode audit UI with a CI-verifiable test

## Technical details

- `NetworkAudit` class monkey-patches browser APIs during `start()` and restores originals on `stop()`
- Guards for Node test environment (no XMLHttpRequest/sendBeacon/WebSocket)
- Privacy Dashboard uses `import.meta.env.DEV` to conditionally render audit UI
- Audit log refreshes every 1s while running; stops automatically when dashboard closes

## Tests written

- `src/utils/__tests__/networkAudit.test.ts` — 10 tests: lifecycle, fetch interception, log management, timestamp validation
- `src/inference/__tests__/privacy-after-load.test.ts` — 2 tests: zero requests during generate, audit catches real requests
- All 376 tests pass (up from 364)

## Screenshots

- Welcome screen with updated privacy copy
- Keyboard shortcut hints on textarea focus
- Privacy Dashboard with Network Audit section
- Privacy Dashboard close button with Esc hint

## Next steps

- Run network audit on a real WebGPU device to verify actual model download behavior
- Phase 4 completion: formal privacy audit checklist
- Address remaining UX issues (#8 footer overlap, #20 PromptSelector mobile overflow)
