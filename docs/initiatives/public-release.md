# Initiative: public-release

**Mission:** a stranger on a supported browser reaches **one successful
journal exchange** (model downloads, reply streams, data persists across
reload) at a stable public URL, and the README tells them honestly what they
are getting. Rules of engagement: [`README.md`](README.md) (standing
decisions, release gate, queue format).

## Grounding (verified 2026-07-13 — planner: re-verify before editing)

- Client-only Vite app; `vite.config.ts` sets `base: "/QuietNote/"` (R1a) for
  the GitHub Pages project URL (`https://guzzler.github.io/QuietNote/`).
- Single page, no client router → no SPA-404 fallback expected (verify).
- **Unsupported-browser state (re-verified in code 2026-07-13):**
  `src/components/WebGPUFallback.tsx` — App.tsx:705-707 returns it *instead
  of the app* (`fixed inset-0 z-50` full-screen card) when the active
  runtime's support check fails. The offending copy is the indigo callout at
  `WebGPUFallback.tsx:59-65` ("You can still use QuietNote for writing…") —
  **contradicted by the behavior: the screen blocks all writing.** Also,
  `transformersjs-engine.ts#checkSupport` (lines 29-45) unconditionally
  returns `{ supported: true }` with a WASM fallback, **but R2 (2026-07-12)
  proved that claim false**: the current ONNX q4f16 model cannot load on
  WASM/CPU (`GatherBlockQuantized` kernel not found) — see the R2 matrix.
  The copy-only fallback fix is the viable direction (R2a).
- **Loading card (verified 2026-07-13):** App.tsx:709-748; the only
  first-time hint is the lock line at App.tsx:741-744 ("First time takes a
  few minutes…") — no size disclosure (R2b). The active `runtimeId` lives in
  `src/hooks/useInferenceEngine.ts` (localStorage `quietnote-runtime`), so
  the card can show a per-backend size.
- **Footer (verified 2026-07-13):** App.tsx:935-962 — lock + "stay on this
  device" + "Share feedback" + "email" separated by `·` spans; room for one
  more quiet link in the same pattern (R3b).
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
| R2 | Cold-start audit (fresh profile: download UX, failure states, browser matrix doc, graceful unsupported-browser state, mobile honesty) — on `vite preview` now, re-run on the live URL at release day | DONE (PR #86) |
| R2a | Honest unsupported-browser fallback (copy-only) + truthful `checkSupport` | queued |
| R2b | Download-size honesty on the loading card | queued |
| R3a | README rewrite for strangers | DONE (PR #81) |
| R3b | In-app footer link to the repo ("open source — verify it yourself") | queued |
| R4 | **Release-day activation (Sharang-triggered):** flip repo public → enable Pages (`gh api repos/Guzzler/QuietNote/pages -X POST -f build_type=workflow`) → deploy runs → live-URL smoke (all backends, full exchange, reload persistence) → release gate → hand to human-feedback F2 | blocked on Sharang |

## Task queue

- [x] 2026-07-11 · **R1e — Cache the MediaPipe model in Cache Storage**
  (DONE 2026-07-12, PR #84 — full detail in Ledger)
- [x] 2026-07-11 · **R2 — Cold-start audit on `vite preview`** (DONE
  2026-07-12, PR #86 — matrix below, full detail in Ledger. Scope caveat:
  WebGPU-less state simulated by deleting `navigator.gpu`; re-verify in real
  Firefox/Safari on the live URL at release day.)
- [ ] 2026-07-13 · **R2a — Honest unsupported-browser fallback (copy-only) +
  truthful `checkSupport`** (firmed from the R2 audit; grounded in code
  2026-07-13): in `src/components/WebGPUFallback.tsx`, replace the indigo
  callout paragraph (lines 59-65, "Your journal entries are stored locally…
  You can still use QuietNote for writing…") with the decided copy below —
  the card full-screen-blocks the app, so it must never promise writing. In
  `src/inference/transformersjs-engine.ts#checkSupport` (lines 29-45), stop
  returning always-supported: require a WebGPU adapter like the other
  engines (the ONNX q4f16 model has no WASM/CPU kernel path — R2 matrix) and
  return `{ supported: false, reason: … }` otherwise; keep the
  `device` field logic for when WebGPU exists. Update the file's header
  comment (line 5, "WebGPU (preferred) or WASM fallback") to match. Add/
  adjust unit tests: fallback card copy contains no "still use QuietNote"
  promise; `checkSupport` returns unsupported when `navigator.gpu` is
  absent. **Not gate-triggering** (no `src/prompts/`/send-path/safety-utils
  files touched). → Verify: `npm run build` + full suite green; on
  `vite preview` with `navigator.gpu` deleted before boot, the fallback card
  shows the new copy and switching to Transformers.js is no longer offered
  as supported; screenshots.
- [ ] 2026-07-13 · **R2b — Download-size honesty on the loading card**
  (firmed from the R2 audit; grounded in code 2026-07-13): a cold start
  auto-downloads 1.49 GB (WebLLM default; 2.00 GB MediaPipe / 3.15 GB
  Transformers.js) with no size disclosure — App.tsx:741-744's "First time
  takes a few minutes." is the only hint. Add a per-runtime size map (e.g.
  `MODEL_DOWNLOAD_SIZES: Record<RuntimeId, string>` = webllm "~1.5 GB",
  transformersjs "~3.2 GB", mediapipe "~2.0 GB" — measured values from
  R1b/R1e) in `src/inference/` and render the decided copy below in the
  loading card's first-time note; `runtimeId` is already available via
  `useInferenceEngine`. Copy-only; no consent-gate UI unless Sharang asks.
  → Verify: unit test asserts the size string renders per runtime; on
  `vite preview` the loading card shows the size line; screenshot.
- [ ] 2026-07-13 · **R3b — Footer "open source" repo link**: in App.tsx's
  footer (lines 935-962), add one more `·`-separated quiet link matching the
  existing "Share feedback" pattern: text "open source", href
  `https://github.com/Guzzler/QuietNote`, `target="_blank"
  rel="noopener noreferrer"`, same classes. Hoist the URL as a constant
  beside `FEEDBACK_ISSUES_URL` in `src/utils/feedbackLinks.ts`. (Link 404s
  for outsiders while the repo is private — same accepted dormancy as F1's
  issues link; activates at R4.) → Verify: unit test pins the href (extend
  `FeedbackChannelGuards` pattern); footer renders calmly on `vite preview`;
  screenshot.

**R2 cold-start audit matrix (2026-07-12, `npm run build` + `npx vite
preview`, Chromium via Playwright; screenshots in
`docs/screenshots/2026-07-12/`):**

| scenario | result |
|---|---|
| Cold start, fresh profile, desktop | ✅ First paint <2 s: calm loading card, spinner, % progress, "First time takes a few minutes. After that, it loads instantly." ⚠️ No size disclosure before a 1.49 GB download auto-starts → R2b |
| Download progress honesty | ✅ WebLLM shows real %; MediaPipe shows real bytes-based % since R1e (PR #84). |
| First exchange → reload persistence | ✅ Verified twice on 07-12 (R1e PR #84): exchange streams, sessions + model survive reload. |
| WebGPU-less browser (`navigator.gpu` removed; proxy for Firefox/Safari) | ❌ Confirmed grounding: full-screen "WebGPU Not Available" card blocks ALL writing while its copy promises "You can still use QuietNote for writing"; no engine-switch affordance → R2a (`r2-webgpu-fallback-block.png`) |
| Transformers.js without WebGPU | ❌ **Not actually WASM-capable with the current model**: ONNX q4f16 requires `com.microsoft.GatherBlockQuantized`, which has no CPU kernel → "Can't create a session … Kernel not found"; app at least fails visibly ("Something went wrong"). Invalidates the preferred "switch to Transformers.js" fix and the model-quality assumption that Transformers.js is the WASM-capable default candidate (`r2-transformersjs-wasm-failure.png`) |
| Mobile 375×812 cold start | ✅ Loading card lays out cleanly at phone width (`r2-mobile-cold-start.png`); ⚠️ same missing size disclosure, worse on cellular → R2b |

**Decided (2026-07-11; confirmed by R2 2026-07-12 — copy-only variant is
the one to ship, the Transformers.js-switch variant is invalidated) —
R2a fallback-card copy (execute: use verbatim):**
> QuietNote's AI companion needs WebGPU, which this browser doesn't offer
> yet. Your data never left this device — nothing was sent or lost. To use
> QuietNote, open it in Chrome or Edge 113+ (or Chrome for Android 121+).

**Decided (2026-07-13) — R2b loading-card size copy (execute: use
verbatim):** replace the first-time note's text (App.tsx:743) with:
> First time: downloads the AI model (~1.5 GB) once, then it's stored on
> this device. After that, it loads instantly.
where "~1.5 GB" comes from the per-runtime size map (webllm ~1.5 GB /
transformersjs ~3.2 GB / mediapipe ~2.0 GB). One calm line, same lock icon
and styling — the disclosure is honesty, not a warning.

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
| 2026-07-12 | R2 — Cold-start audit on `vite preview` | #86 | Audit-only PR (no fixes, per task). Matrix committed above; 2 defects filed as proposed queue items: R2a (fallback-card contradiction confirmed + preferred Transformers.js-switch variant invalidated — ONNX q4f16 has no WASM/CPU kernel path) and R2b (no download-size disclosure before a 1.49 GB auto-download). Scope caveat: WebGPU-less state simulated by removing `navigator.gpu` (the exact check `checkSupport` uses); real Firefox/Safari re-run stays tied to the release-day live-URL pass. Cross-initiative flag: model-quality's "Transformers.js (WASM-capable) as default after WebLLM removal" assumption is contradicted — noted in model-quality.md. |
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
