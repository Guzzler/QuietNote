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
- **Footer (re-verified 2026-07-14):** App.tsx:940-967 (drifted from 935-962
  after PRs #87/#88) — lock + "stay on this device" + "Share feedback" +
  "email" separated by `·` spans; room for one more quiet link in the same
  pattern (R3b). `FEEDBACK_ISSUES_URL`/`FEEDBACK_MAILTO` confirmed in
  `src/utils/feedbackLinks.ts` (no query params, bare constants).
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
- **Deploy-gate re-verified against the live file 2026-07-27** (was
  2026-07-21 — unchanged): `.github/workflows/deploy.yml`'s `deploy` job
  (line 39) still carries `if: ${{ !github.event.repository.private }}`, so it
  skips cleanly while private and flips to running automatically the moment
  Sharang makes the repo public at R4 — **no workflow edit is needed on
  release day**. The `build` job runs on every push (build +
  `upload-pages-artifact`) with `configure-pages` set `continue-on-error`
  (line 30), so doc-only pushes to `main` don't fail CI while Pages is
  disabled. R4's Pages-enable command
  (`gh api repos/Guzzler/QuietNote/pages -X POST -f build_type=workflow`)
  is still the correct current-API invocation for the Actions build type —
  and **re-confirmed the POST (create) verb is right, not PUT (update):** a
  live `gh api repos/Guzzler/QuietNote/pages` on 2026-07-27 returns
  `404 Not Found`, i.e. no Pages site exists yet, so R4 creates one. Repo
  visibility re-checked the same day: still `PRIVATE`, so there is no live
  URL and the deploy job is dormant exactly as designed.
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
| R2a | Honest unsupported-browser fallback (copy-only) + truthful `checkSupport` | DONE (PR #87) |
| R2b | Download-size honesty on the loading card | DONE (PR #88) |
| R3a | README rewrite for strangers | DONE (PR #81) |
| R3b | In-app footer link to the repo ("open source — verify it yourself") | DONE (PR #90) |
| R4 | **Release-day activation (Sharang-triggered):** flip repo public → enable Pages (`gh api repos/Guzzler/QuietNote/pages -X POST -f build_type=workflow`) → deploy runs → live-URL smoke (all backends, full exchange, reload persistence) → release gate → hand to human-feedback F2 | blocked on Sharang |

## Task queue

- [x] 2026-07-11 · **R1e — Cache the MediaPipe model in Cache Storage**
  (DONE 2026-07-12, PR #84 — full detail in Ledger)
- [x] 2026-07-11 · **R2 — Cold-start audit on `vite preview`** (DONE
  2026-07-12, PR #86 — matrix below, full detail in Ledger. Scope caveat:
  WebGPU-less state simulated by deleting `navigator.gpu`; re-verify in real
  Firefox/Safari on the live URL at release day.)
- [x] 2026-07-13 · **R2a — Honest unsupported-browser fallback (copy-only) +
  truthful `checkSupport`** (DONE 2026-07-13, PR #87 — see Ledger)
- [x] 2026-07-13 · **R2b — Download-size honesty on the loading card**
  (DONE 2026-07-13, PR #88 — see Ledger)
- [x] 2026-07-13 · **R3b — Footer "open source" repo link** (DONE 2026-07-14,
  PR #90 — see Ledger) (re-grounded
  2026-07-14): in App.tsx's
  footer (lines 940-967), add one more `·`-separated quiet link matching the
  existing "Share feedback" pattern: text "open source", href
  `https://github.com/Guzzler/QuietNote`, `target="_blank"
  rel="noopener noreferrer"`, same classes. Hoist the URL as a constant
  beside `FEEDBACK_ISSUES_URL` in `src/utils/feedbackLinks.ts`. (Link 404s
  for outsiders while the repo is private — same accepted dormancy as F1's
  issues link; activates at R4.) → Verify: unit test pins the href (extend
  `FeedbackChannelGuards` pattern); footer renders calmly on `vite preview`;
  screenshot.

**Queue note (2026-07-14):** R3b is the LAST non-gated public-release
increment. After it ships, this initiative is release-ready and everything
remaining (R4, LICENSE) is Sharang-gated — do not invent further items here;
model-quality (M1/M2a) is where open work lives.

**Queue-empty audit (2026-07-26, execute — `npm run build` (green) +
`npm run test` (1066 green) + `npx vite preview` on `:4173`, WebLLM default,
Chromium via Playwright):** every non-gated item across all four initiatives
is DONE (M6/M7 shipped 2026-07-25, PR #112) and only Sharang-gated work
remains (R4/LICENSE here, F2, M6 Colab rerun → M4 rerun, M5a Colab run,
WebLLM go/no-go), so per the queue-empty rule an audit walk ran instead of
inventing work. Walked load → writing surface → first exchange → reload
persistence: loading card shows the R2b "~1.5 GB" size line + `0%` progress;
a fresh free-write entry ("I moved to a new city last month and I still feel
like I don't belong here…") returned a supportive, non-parroting
single-question reply ("It sounds like you're navigating a new city and that
feeling of not fitting in can be tough. How is it different from what felt
familiar back home?") with the AI-limitations disclaimer + Crisis resources
button present; the session persisted through a full reload (sidebar entry
"Sat with calm feelings." + "Pick up where you left off" card + fully
restored two-turn transcript on re-open). **0 console errors** (one benign
Chromium `powerPreference`-ignored WebGPU warning, crbug.com/369219127).
**No defects found — nothing to file.** Same scope caveat as 07-21/07-22: the
Playwright profile was persistent (prior sessions present), so this was a
returning-user walk, not a true fresh-profile cold start — the fresh-profile
matrix stays the 2026-07-12 R2 read, to be re-run on the live URL at R4.
Screenshots: `docs/screenshots/2026-07-26/`.

**Queue-empty audit (2026-07-22, execute — `npm run build` (green) +
`npm run test` (1053 green) + `npx vite preview` on `:4173`, WebLLM default,
Chromium via Playwright):** every non-gated item across all three
initiatives is DONE and only Sharang-gated work remains (R4/LICENSE here, F2,
M2c §6 veto, M5a Colab run, WebLLM go/no-go), so per the queue-empty rule an
audit walk ran instead of inventing work. Walked load → writing surface →
first exchange → reload persistence: loading card shows the R2b "~1.5 GB"
size line + `0%→…` progress; a fresh free-write entry ("I keep putting off a
big project at work and the guilt is piling up…") returned a supportive,
non-parroting single-question reply ("You're feeling the weight of that
project… What's causing you to feel pulled in different directions?") with
the AI-limitations disclaimer + Crisis resources button present; the session
persisted through a full reload (sidebar entry "Reflected on creativity." +
"Pick up where you left off" card + fully restored two-turn transcript on
re-open). **0 console errors** (one benign Chromium `powerPreference`-ignored
WebGPU warning, crbug.com/369219127). **No defects found — nothing to file.**
Same scope caveat as 07-21: the Playwright profile was persistent (07-13/07-21
sessions present), so this was a returning-user walk, not a true
fresh-profile cold start — the fresh-profile matrix stays the 2026-07-12 R2
read, to be re-run on the live URL at R4. Screenshots:
`docs/screenshots/2026-07-22/`.

**Queue-empty audit (2026-07-21, execute — `npm run build` + `npx vite
preview` on `:4173`, WebLLM default, Chromium via Playwright):** every
non-gated item across all three initiatives is DONE and only Sharang-gated
work remains (R4/LICENSE here, F2, M2c §6 veto, M5a Colab run, WebLLM
go/no-go), so per the queue-empty rule an audit walk ran instead of inventing
work. Walked load → writing surface → first exchange → reload persistence:
loading card shows the R2b "~1.5 GB" size line + real % progress; a fresh
free-write exchange returned a supportive, non-parroting single-question
reply ("It sounds like you've been juggling a lot this week. What's making it
feel extra hard to handle?") with the AI-limitations disclaimer + Crisis
resources button present; the session persisted through a full reload
(sidebar entry + restored transcript). **0 console errors** (one benign
Chromium `powerPreference`-ignored WebGPU warning, crbug.com/369219127).
**No defects found — nothing to file.** Scope caveat: the Playwright profile
was persistent (prior 07-13 sessions present), so this was a returning-user
walk, not a true fresh-profile cold start — the fresh-profile matrix stays
the 2026-07-12 R2 read, to be re-run on the live URL at R4. Screenshots:
`docs/screenshots/2026-07-21/`.

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
| 2026-07-14 | R3b — Footer "open source" repo link | #90 | Added a fourth `·`-separated quiet link "open source" → `https://github.com/Guzzler/QuietNote` (`target="_blank" rel="noopener noreferrer"`, same classes as "Share feedback") in the App.tsx footer; URL hoisted as `REPO_URL` beside `FEEDBACK_ISSUES_URL` in `src/utils/feedbackLinks.ts`. `FeedbackChannelGuards` extended (2 tests: href pinned + no query string; footer renders the link). Link 404s for outsiders while the repo is private — accepted dormancy, activates at R4. Verified on `vite preview`: all three footer hrefs correct in DOM, calm rendering (screenshot `docs/screenshots/2026-07-14/`). Build green, 1350 tests. This was the LAST non-gated public-release increment — initiative is release-ready, waiting on R4. |
| 2026-07-13 | R2b — Download-size honesty on the loading card | #88 | Decided copy rendered verbatim on the loading card with the active runtime's measured size via new `MODEL_DOWNLOAD_SIZES` map in `src/inference/types.ts` (webllm ~1.5 GB / transformersjs ~3.2 GB / mediapipe ~2.0 GB — R1b/R1e values). Copy-only, same lock icon + calm styling, no consent gate. `DownloadSizeHonesty.test.ts` pins sizes + disclosure. Verified on `vite preview` in a fresh browser context (screenshot in `docs/screenshots/2026-07-13/`). Build green, 1346 tests. Not gate-triggering (App.tsx change is the loading card JSX only, not the send path). |
| 2026-07-13 | R2a — Honest unsupported-browser fallback + truthful `checkSupport` | #87 | Applied the decided copy verbatim to `WebGPUFallback.tsx` (no promise the screen blocks; "your data never left this device"; points to Chrome/Edge 113+). `transformersjs-engine.checkSupport` now requires a WebGPU adapter (mirrors WebLLM's check) instead of claiming always-supported — the ONNX q4f16 model has no WASM/CPU kernel path. PrivacyDashboard picker description dropped its "WebGPU/WASM" claim too. New `WebGPUFallbackGuards.test.ts` pins both honesty contracts; engine checkSupport tests rewritten (4 cases). Verified on `vite preview` with `navigator.gpu` deleted before boot: new copy renders, old promise absent (screenshot in `docs/screenshots/2026-07-13/`). Build green, 1342 tests. Not gate-triggering (no prompts/send-path/safety files). |
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
