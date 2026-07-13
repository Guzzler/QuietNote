# Initiative: public-release

**Mission:** a stranger on a supported browser reaches **one successful
journal exchange** (model downloads, reply streams, data persists across
reload) at a stable public URL, and the README tells them honestly what they
are getting. Rules of engagement: [`README.md`](README.md) (standing
decisions, release gate, queue format).

## Grounding (verified 2026-07-11 — planner: re-verify before editing)

- Client-only Vite app; `vite.config.ts` sets `base: "/QuietNote/"` (R1a) for
  the GitHub Pages project URL (`https://guzzler.github.io/QuietNote/`).
- Single page, no client router → no SPA-404 fallback expected (verify).
- **Unsupported-browser state (verified 2026-07-11):**
  `src/components/WebGPUFallback.tsx` exists and App.tsx returns it *instead
  of the app* (`fixed inset-0 z-50` full-screen card) when the active
  runtime's support check fails. Its copy says "You can still use QuietNote
  for writing" — **contradicted by the behavior: the screen blocks all
  writing.** Also, `transformersjs-engine.ts` reports itself always-supported
  (WASM fallback), so a WebGPU-less browser is only blocked because the
  *default* runtime (WebLLM) is WebGPU-only — the block screen offers no way
  to switch. R2 must verify this in a real Firefox/Safari session.
- 3 backends: WebLLM (Gemma 2 2B, WebGPU), Transformers.js v4 (Gemma 4 E2B
  ONNX, WebGPU/WASM), MediaPipe (Gemma 4 E2B LiteRT, WASM). Models download
  at runtime from HF/WebLLM CDNs — designed for cross-origin use (verify from
  the Pages origin). `src/utils/webgpuCheck.ts` exists (capability detection).
- **MediaPipe model caching: FIXED by R1e (PR #84, 2026-07-12).** The app
  now owns the fetch (`mediapipe-cache` in Cache Storage, streamed into
  `modelAssetBuffer`) with real byte-level download progress. Measured: the
  `.task` is **2.00 GB** (earlier "~3 GB" was wrong). Browsers whose origin
  quota can't hold it skip the cache and stream directly (still works,
  re-downloads per visit).
- **Known risk:** GitHub Pages cannot set COOP/COEP headers. WebGPU paths
  should not need cross-origin isolation; WASM *threading* might. If a
  backend breaks on the live origin, the fix ladder is: `coi-serviceworker`
  shim (self-contained, privacy-neutral) → honest per-backend UI note. Never
  silently ship a broken backend picker.
- **Repo is PRIVATE and stays private until release day** (Sharang deferred
  the go-public flip on 2026-07-10; the loop must NEVER change visibility).
  GitHub Free cannot serve Pages from a private repo → there is no live URL
  yet. Everything below is built release-ready now and activates at
  release day (see R4). Production behavior is verified locally via
  `npm run build` + `npx vite preview` (serves `dist/` at the configured
  `base`).
- `README.md` today is the **stock Vite template** (React+TS+Vite boilerplate,
  ESLint config advice) — R3a is a from-scratch write, not an edit.
- No LICENSE file (see Blocked).
- 1300+ Vitest tests; `npm run build` is TS-strict and must stay green.

## Increments

| id | what | status |
|---|---|---|
| R1a | Pages deploy workflow, gated to skip while private (+ Vite `base`) | DONE (PR #79) |
| R1b | Production-build smoke test of all 3 backends + persistence on local `vite preview` | DONE (PR #80) |
| R1c | Lora font missing from production build | DONE (PR #82) |
| R1d | MediaPipe backend fails at inference under production build | DONE (PR #83) |
| R2 | Cold-start audit (fresh profile: download UX, failure states, browser matrix doc, graceful unsupported-browser state, mobile honesty) — on `vite preview` now, re-run on the live URL at release day | queued |
| R3a | README rewrite for strangers | DONE (PR #81) |
| R3b | In-app about/footer link to the repo ("open source — verify it yourself") | after R3a |
| R4 | **Release-day activation (Sharang-triggered):** flip repo public → enable Pages (`gh api repos/Guzzler/QuietNote/pages -X POST -f build_type=workflow`) → deploy runs → live-URL smoke (all backends, full exchange, reload persistence) → release gate → hand to human-feedback F2 | blocked on Sharang |

## Task queue

- [x] 2026-07-11 · **R1e — Cache the MediaPipe model in Cache Storage**
  (DONE 2026-07-12, PR #84 — see Ledger)
  (grounded 2026-07-12 against code + installed typings): the cause is
  structural — `src/inference/mediapipe-engine.ts` passes
  `modelAssetPath: MODEL_URL` and lets MediaPipe fetch the ~3 GB `.task`
  itself, so nothing ever writes it to Cache Storage (unlike `webllm/*` and
  `transformers-cache`) and it re-downloads whenever the HTTP cache evicts.
  The fix path is **confirmed supported**: `@mediapipe/tasks-genai@0.10.27`'s
  `BaseOptions` accepts `modelAssetBuffer?: Uint8Array |
  ReadableStreamDefaultReader` (`node_modules/@mediapipe/tasks-genai/genai.d.ts:46`).
  Implement in `load()`: open a cache (e.g. `mediapipe-cache`), on miss
  `fetch(MODEL_URL)` → `cache.put`, then `cache.match` →
  `response.body.getReader()` → pass as `modelAssetBuffer` (drop
  `modelAssetPath`). Owning the fetch also unlocks **real download progress**
  (Content-Length + bytes read) — today the MediaPipe path fakes progress
  (jumps 0.1 → 1), which R2's download-UX audit would flag anyway; wire
  `onProgress` to actual bytes. Fallback if streaming into the graph
  misbehaves: honest size note in the backend picker ("~3 GB, may re-download
  each visit"). → Verify on `vite preview`: first load populates a
  `mediapipe-cache` Cache Storage entry + progress bar moves with the
  download; reload with HTTP cache cleared (DevTools → Network → Disable
  cache checked once, or clear browser cache, Cache Storage left intact)
  reaches ready WITHOUT re-downloading 3 GB (network tab shows no model
  fetch); full exchange still works; screenshots.
- [ ] 2026-07-11 · **R2 — Cold-start audit on `vite preview`** (do after R1c +
  R1d so findings aren't polluted by known bugs): with a fresh browser
  profile (or fully cleared site data), walk the stranger's path against
  `npm run build` + `npx vite preview`: first paint → what tells you a
  model is downloading → progress honesty on a slow connection → first
  exchange → reload persistence. Then the failure states: (a) Firefox and
  (b) Safari if available — confirm the grounding's finding that
  `WebGPUFallback` full-screen-blocks the app while its copy claims "You can
  still use QuietNote for writing", and whether switching to Transformers.js
  (WASM, always-supported) is possible from that state; (c) narrow/mobile
  viewport honesty. Write the results as a browser-matrix section in this
  doc; file each defect found as a proposed queue item — **do not fix in the
  audit PR**. For the unsupported-browser contradiction, the decided
  direction (2026-07-11) is below — apply it as a queue item only after the
  audit confirms the behavior. → Verify: matrix in this doc, screenshots per
  browser to `docs/screenshots/2026-07-11/`.

**Decided (2026-07-11) — unsupported-browser state, pending R2 confirmation:**
the screen must never promise what it blocks. Preferred end state: when only
the default runtime is unsupported, offer "Try Transformers.js instead — it
runs without WebGPU (slower)" as an action on the fallback card. If that's
more than a small change, the cheap honest fix is copy-only — replace the
"You can still use QuietNote for writing" paragraph with:
> QuietNote's AI companion needs WebGPU, which this browser doesn't offer
> yet. Your data never left this device — nothing was sent or lost. To use
> QuietNote, open it in Chrome or Edge 113+ (or Chrome for Android 121+).
Either way, no copy/behavior contradiction ships to strangers.

## R1b smoke results (2026-07-10, `npx vite preview` on built `dist/`, real Chrome, Windows 11 + WebGPU)

| backend | model | download (measured) | result |
|---|---|---|---|
| WebLLM (default) | Gemma 2 2B q4f16 | **1.49 GB** model + 5.3 MB wasm (Cache Storage `webllm/*`) | ✅ progress UI visible → full exchange streamed → reload → session persisted (IndexedDB) |
| Transformers.js | Gemma 4 E2B ONNX q4f16 | **3.15 GB** (Cache Storage `transformers-cache`; ~7 min on test connection) | ✅ full exchange streamed (engine switch persists via `quietnote-runtime` localStorage; model loads on next boot, not immediately at switch) |
| MediaPipe | Gemma 4 E2B LiteRT (`gemma-4-E2B-it-web.task`, ~3 GB) | downloads + engine initializes; **no Cache Storage entry → likely re-downloads every load** | ❌ first send fails: `INVALID_ARGUMENT: CalculatorGraph::Run() failed` / `[newSession] Inference failed`; no reply rendered → queued R1d |

Cross-cutting: Lora serif font broken in production build (missing woff2 in
`dist/`) → queued R1c. Total storage with two model caches: ~4.65 GB.

## Ledger

| date | item | PR | outcome |
|---|---|---|---|
| 2026-07-12 | R1e — MediaPipe model persisted in Cache Storage | #84 | App now owns the fetch: miss → byte-counted stream into `mediapipe-cache` (real progress from Content-Length, e.g. "48% of 2.0 GB"), hit → stream from disk into `modelAssetBuffer` (dropped `modelAssetPath`). **Measured: the .task is 2.00 GB, not ~3 GB as previously documented.** Verified on `vite preview` (real Chromium profile): first load populated the cache entry + progress tracked the download; reload reached ready in <30 s with ZERO huggingface requests; full exchange before and after reload; sessions persisted. Two fallbacks, both tested: quota-precheck skips the put when the origin can't hold the model (avoids a doomed put + double download — hit for real in a 7.2 GB-quota browser profile, where load still succeeded by streaming direct with real progress), and put-failure refetches direct. 6 new tests; 1326 green. Total storage all 3 model caches ≈ 6.65 GB. |
| 2026-07-11 | R1d — MediaPipe first-send inference failure | #83 | Not production-specific: MediaPipe's `maxTokens` is a TOTAL (input+output) budget and was 1024 while the app builds prompts to `MODEL_CONTEXT_LIMIT` 4096 (system prompt alone ~1.6–1.9k tokens) → first send always overflowed → `INVALID_ARGUMENT: CalculatorGraph::Run() failed`. Fix: `maxTokens: MODEL_CONTEXT_LIMIT` + pinned the CDN wasm fileset to the installed `@mediapipe/tasks-genai@0.10.27` (was unpinned → JS/WASM drift risk). Verified full exchange on `vite preview` (reply streamed, no console errors); 2 regression tests; 1320 green. Cache Storage gap (re-download) → queued R1e. |
| 2026-07-11 | R1c — Lora font missing from production build | #82 | Root cause as diagnosed: CSS `@import "@fontsource-variable/lora"` shipped the package's relative `url(./files/...)` verbatim; no woff2 in `dist/`. Fix: JS import `@fontsource-variable/lora/index.css` in `main.tsx` (bare specifier fails TS strict — package ships no types). Built CSS now has `url(/QuietNote/assets/lora-*.woff2)`, 8 woff2 emitted, preview: woff2 200, no OTS error, `document.fonts.check("16px Lora Variable")` true, textarea computed font Lora. 1318 tests green. |
| 2026-07-10 | R1a — Pages deploy workflow (dormant) + Vite base | #79 | Shipped. Build job = CI; deploy job gated on `!private`, skips until R4. Found+fixed `/logo.svg` absolute-path 404 under base (App.tsx → `import.meta.env.BASE_URL`). `vite preview` at `/QuietNote/` zero 404s; 1318 tests green. |
| 2026-07-10 | R3a — README rewrite for strangers | #81 | Stock Vite template replaced. Decided hero copy verbatim; live-URL line marked "activating at release"; privacy story, 4 modes, honest safety note, WebGPU requirements, measured download sizes from R1b (1.5 GB default / ~3 GB alternates); 2 screenshots; dev setup below the fold. No LICENSE added (Sharang's call). |
| 2026-07-10 | R1b — Production-build backend smoke (local) | #80 | WebLLM ✅ (1.49 GB, exchange + persistence), Transformers.js ✅ (3.15 GB, exchange), MediaPipe ❌ (`CalculatorGraph::Run() failed` at inference; no model cache) → queued R1d. Found Lora font missing from `dist/` → queued R1c. Screenshots in `docs/screenshots/2026-07-10/`. |

## Blocked on Sharang

- **Go-public + Pages activation (R4)** — the release-day trigger. The loop
  prepares everything; Sharang flips visibility when he declares the app
  ready. Never flip it autonomously. **Deferred until the model-quality bar
  is met** (Sharang 2026-07-12): the soft launch is now gated on
  model-quality's 10-turn quality bar; he'll decide R4 after that.
- **LICENSE choice** — no license file yet (default all-rights-reserved).
  Suggest MIT; execute must not add one autonomously. Deferred with R4
  (2026-07-12).
