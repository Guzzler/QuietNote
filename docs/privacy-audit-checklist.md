# QuietNote Privacy Audit Checklist

A structured checklist for verifying QuietNote's privacy guarantees. This document covers data flows, network behavior, storage verification, and code audit pointers. It can be used by developers, reviewers, or auditors to confirm that QuietNote meets its core promise: **all user data stays on the device**.

---

## 1. Data Flow Inventory

### What data is collected

| Data Type | Description | Storage Location |
|-----------|-------------|-----------------|
| Journal entries | User messages and AI responses per session | IndexedDB (`quietnote-db`, `sessions` store) |
| Mood entries | Emotion, intensity, optional note, timestamp | IndexedDB (`quietnote-db`, `moods` store) |
| Session metadata | Session ID, creation/update timestamps, threads | IndexedDB (`quietnote-db`, `sessions` store) |
| Inference engine preference | Which AI backend the user selected | In-memory (resets on reload) |

### What leaves the device (one-time, during model setup)

| Request | Destination | Purpose |
|---------|-------------|---------|
| WebLLM model download | `huggingface.co/mlc-ai/gemma-2-2b-it-q4f32_1-MLC` | Download Gemma 2 2B model weights |
| Transformers.js model download | `huggingface.co/onnx-community/gemma-4-E2B-it-ONNX` | Download Gemma 4 E2B ONNX model |
| MediaPipe model download | `huggingface.co/litert-community/gemma-4-E2B-it-litert-lm` | Download Gemma 4 E2B LiteRT model |
| MediaPipe WASM runtime | `cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm` | Download MediaPipe WASM binaries |

### What NEVER leaves the device

- [ ] Journal entry text (user messages)
- [ ] AI response text (assistant messages)
- [ ] Mood entries (emotion, intensity, notes)
- [ ] Session history and metadata
- [ ] System prompts and crisis detection results
- [ ] Emotion extraction and theme analysis results
- [ ] Exported data (JSON export stays local)

---

## 2. Network Verification

### Using the Network Audit utility (dev mode)

The Network Audit utility (`src/utils/networkAudit.ts`) intercepts `fetch`, `XMLHttpRequest`, `sendBeacon`, and `WebSocket` to log all outbound requests.

**Steps:**
- [ ] Start the dev server: `npm run dev`
- [ ] Open the app at `http://localhost:5173`
- [ ] Open the Privacy Dashboard (shield icon in header)
- [ ] Scroll to the "Network Audit" section (visible in dev mode only)
- [ ] Click "Start Audit"
- [ ] Perform the following actions and verify **zero new network requests** appear:
  - [ ] Type and send a journal entry
  - [ ] Receive an AI response
  - [ ] Open the mood tracker and log a mood
  - [ ] Switch journaling modes (Free Write, Gratitude, Check-in, Thought Record)
  - [ ] Use a journal prompt from the Prompt selector
  - [ ] View mood patterns
  - [ ] Export all data
  - [ ] Start a new session
  - [ ] Switch between sessions
  - [ ] Delete a session
- [ ] Click "Stop Audit" and review the request log
- [ ] Confirm: the only network requests recorded should be the initial model download (if the model was not already cached)

### Expected outbound requests

**During initial model load (one-time):**
- `GET` to HuggingFace CDN (`huggingface.co`) or Google Storage for model weights
- Subsequent loads use the browser Cache API — no network requests

**During all other operations (journaling, mood tracking, session management, data export):**
- Expected request count: **zero**

### Automated privacy test

- [ ] Run: `npm run test -- privacy-after-load`
- [ ] Verify the `privacy-after-load.test.ts` test suite passes
- [ ] This test confirms that after engine creation, no network requests are made during `generate()` calls

---

## 3. Storage Verification

### Inspecting IndexedDB via DevTools

- [ ] Open browser DevTools > Application > IndexedDB
- [ ] Locate database: `quietnote-db` (version 2)
- [ ] Verify two object stores exist:
  - `sessions` — keyed by `id`, contains journal session objects
  - `moods` — keyed by `id`, indexed by `ts`, `emotion`, `sessionId`
- [ ] Confirm no other databases are created by QuietNote
- [ ] Confirm no `localStorage` or `sessionStorage` entries from QuietNote

### Privacy Dashboard verification

- [ ] Open the Privacy Dashboard in the app
- [ ] "Your Data" section shows:
  - Number of journal sessions (matches IndexedDB `sessions` store count)
  - Number of mood entries (matches IndexedDB `moods` store count)
  - Total browser storage estimate (includes cached model files)

### Export All Data

- [ ] Click "Export All Data" in the Privacy Dashboard
- [ ] Verify a JSON file is downloaded directly to the user's device
- [ ] Verify the export contains `sessions` and `moods` arrays
- [ ] Confirm: **no network request** is made during export (data is serialized client-side)

### Erase All Data

- [ ] Click "Erase All Data" in the Privacy Dashboard
- [ ] Confirm the confirmation dialog appears
- [ ] After confirming, verify:
  - IndexedDB `sessions` store is empty
  - IndexedDB `moods` store is empty
  - App UI resets to the welcome screen
- [ ] Confirm: **no network request** is made during erasure

---

## 4. Code Audit Pointers

### Files that handle network requests

Only inference engine files make network requests, and only for model downloads:

| File | Network Activity |
|------|-----------------|
| `src/inference/webllm-engine.ts` | Model download via `@mlc-ai/web-llm` (HuggingFace CDN) |
| `src/inference/transformersjs-engine.ts` | Model download via `@huggingface/transformers` (HuggingFace CDN) |
| `src/inference/mediapipe-engine.ts` | Model download via `@mediapipe/tasks-genai` (HuggingFace + jsDelivr CDN) |

**No other source files in `src/` should contain `fetch()`, `XMLHttpRequest`, `sendBeacon`, or `WebSocket` calls** (except the network audit utility itself, which only intercepts — it does not initiate requests).

### Files that handle user data

| File | Data Handled |
|------|-------------|
| `src/storage.ts` | All IndexedDB operations: read/write sessions and moods |
| `src/components/ChatPanel.tsx` | Displays and manages journal messages in UI |
| `src/components/MoodTracker.tsx` | Mood entry creation and pattern display |
| `src/components/PrivacyDashboard.tsx` | Data export, data erasure, storage statistics |

### Where system prompts are defined

| File | Details |
|------|---------|
| `src/App.tsx` (lines 18-77) | All system prompts: Free Write, Gratitude, Check-in (morning/evening), Thought Record |

All system prompts explicitly prohibit medical advice, diagnosis, and medication recommendations.

### Where crisis detection runs

| File | Details |
|------|---------|
| `src/utils/crisisDetection.ts` | Keyword-based crisis detection — runs entirely in-browser, no external API calls |

### Where emotion/theme extraction runs

| File | Details |
|------|---------|
| `src/utils/emotionExtractor.ts` | Keyword-based emotion extraction — local, no API |
| `src/utils/themeExtractor.ts` | Keyword-based theme extraction — local, no API |

---

## 5. Ongoing Verification

### After every code change

- [ ] Run `npm run test` — all tests pass, including privacy-after-load tests
- [ ] Run `npm run build` — production build succeeds
- [ ] Verify production build does **not** include dev-only audit code (the `NetworkAudit` class is guarded by `import.meta.env.DEV`)

### After changes that touch inference or data flow

- [ ] Start the dev server and run a Network Audit session (see Section 2)
- [ ] Confirm no unexpected outbound requests during journaling, mood tracking, or data operations
- [ ] If a new inference backend is added, verify it only makes requests for model downloads

### After dependency updates

- [ ] Review the changelog of updated packages for any new telemetry, analytics, or network behavior
- [ ] Run a Network Audit session to confirm no new outbound requests
- [ ] Pay special attention to updates to: `@mlc-ai/web-llm`, `@huggingface/transformers`, `@mediapipe/tasks-genai`

---

## 6. Privacy Claim Verification Summary

| Claim | How to Verify |
|-------|--------------|
| "Your journal entries stay on this device" | Network Audit during journaling shows zero requests |
| "All AI runs locally in the browser" | Model inference happens via WebGPU/WASM; no API calls to external LLM services |
| "No accounts, no servers" | No authentication code exists; no server endpoints in codebase |
| "Works offline after setup" | Disconnect network after model download; app continues to function |
| "Your data is never sent anywhere" | Automated privacy-after-load test + manual Network Audit confirm zero data exfiltration |

---

*Last updated: 2026-04-14*
