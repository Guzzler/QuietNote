# Initiative: public-release

**Mission:** a stranger on a supported browser reaches **one successful
journal exchange** (model downloads, reply streams, data persists across
reload) at a stable public URL, and the README tells them honestly what they
are getting. Rules of engagement: [`README.md`](README.md) (standing
decisions, release gate, queue format).

## Grounding (verified 2026-07-10 — planner: re-verify before editing)

- Client-only Vite app; `vite.config.ts` sets **no `base`** today — GitHub
  Pages project URL (`https://guzzler.github.io/QuietNote/`) needs
  `base: "/QuietNote/"` or assets 404.
- Single page, no client router → no SPA-404 fallback expected (verify).
- 3 backends: WebLLM (Gemma 2 2B, WebGPU), Transformers.js v4 (Gemma 4 E2B
  ONNX, WebGPU/WASM), MediaPipe (Gemma 4 E2B LiteRT, WASM). Models download
  at runtime from HF/WebLLM CDNs — designed for cross-origin use (verify from
  the Pages origin). `src/utils/webgpuCheck.ts` exists (capability detection).
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
| R1a | Pages deploy workflow, gated to skip while private (+ Vite `base`) | queued |
| R1b | Production-build smoke test of all 3 backends + persistence on local `vite preview` | queued |
| R2 | Cold-start audit (fresh profile: download UX, failure states, browser matrix doc, graceful unsupported-browser state, mobile honesty) — on `vite preview` now, re-run on the live URL at release day | after R1b |
| R3a | README rewrite for strangers | queued |
| R3b | In-app about/footer link to the repo ("open source — verify it yourself") | after R3a |
| R4 | **Release-day activation (Sharang-triggered):** flip repo public → enable Pages (`gh api repos/Guzzler/QuietNote/pages -X POST -f build_type=workflow`) → deploy runs → live-URL smoke (all backends, full exchange, reload persistence) → release gate → hand to human-feedback F2 | blocked on Sharang |

## Task queue

- [x] 2026-07-10 · **R1a — Pages deploy workflow (dormant until public)** (PR #79):
  add `.github/workflows/deploy.yml` — on push to `main`: build job (`npm
  ci`, `npm run build`, `actions/configure-pages` +
  `actions/upload-pages-artifact` on `dist/`) and a deploy job
  (`actions/deploy-pages`) with permissions `contents: read`, `pages: write`,
  `id-token: write` and a `pages` concurrency group; **gate the deploy job
  with `if: ${{ !github.event.repository.private }}`** (the `${{ }}` wrapper
  is required — bare `if: !...` is invalid YAML, `!` starts a tag) so runs
  skip cleanly while
  the repo is private and light up automatically at release day (the build
  job doubles as CI meanwhile). Do NOT enable Pages and do NOT touch repo
  visibility — both are R4/release-day. Set Vite `base: "/QuietNote/"`
  (note: Vite applies `base` in dev too, so `npm run dev` will serve at
  `http://127.0.0.1:5173/QuietNote/` from then on — expected, don't "fix"
  it). → Verify: PR, merge, `gh run
  watch` shows build job green + deploy job skipped; `npx vite preview`
  serves the app shell at `http://localhost:4173/QuietNote/` with zero 404s;
  screenshot to `docs/screenshots/2026-07-10/`.
- [x] 2026-07-10 · **R1b — Production-build backend smoke (local)** (PR #80 —
  see "R1b smoke results" below; WebLLM ✅, Transformers.js ✅, MediaPipe ❌
  inference error recorded, Lora-font production bug found; follow-ups
  queued): against
  `npx vite preview` (the built `dist/`, not the dev server) in a real
  browser session: default backend downloads its model (progress visible),
  one full journal exchange streams, reload → session persists (IndexedDB).
  Then try the other two backends. → Verify: screenshots of the exchange;
  record measured model-download sizes in this doc (human-feedback F2 needs
  them); if a backend fails under the production build, record the exact
  console error here and queue the follow-up — do not block this task's PR
  on fixing it. (Live-URL re-run happens at R4.)
- [ ] 2026-07-10 · **R1c — Fix Lora serif font missing from production build**:
  `npm run build` (rolldown-vite) does not emit the
  `@fontsource-variable/lora` woff2 files — `dist/assets/index-*.css`
  references `files/lora-*-wght-normal.woff2` but no woff2 exists anywhere in
  `dist/` (build log warns "didn't resolve at build time"). At runtime the
  SPA fallback serves index.html for the font URL → console `OTS parsing
  error: invalid sfntVersion: 1008821359` (that value is ASCII `<!DO`) and
  the writing surface silently falls back to a non-Lora serif. Fix so the
  woff2 files are emitted and load (e.g. import the font files explicitly or
  copy them via `public/`), keeping `VisualCalmGuards` green. → Verify:
  `npx vite preview`, network shows woff2 200 with font content-type, no OTS
  console error, screenshot of writing surface in Lora.
- [ ] 2026-07-10 · **R1d — MediaPipe backend fails at inference under the
  production build**: model (~3 GB `gemma-4-E2B-it-web.task` from HF
  `litert-community`) downloads and the engine initializes ("Graph
  successfully started running"), but the first send fails with console
  `INVALID_ARGUMENT: CalculatorGraph::Run() failed` + `[newSession] Inference
  failed`, and the entry produces no reply. Also observed: MediaPipe leaves
  no Cache Storage entry (unlike webllm/* and transformers-cache), so the
  ~3 GB model likely re-downloads every load. Reproduce (also check dev
  server to see if it's production-specific), then either fix or apply the
  grounding's fix ladder (honest per-backend UI note — never silently ship a
  broken backend picker). → Verify: full exchange on MediaPipe on `vite
  preview`, or the UI note shipped; screenshots either way.
- [ ] 2026-07-10 · **R3a — README rewrite for strangers**: the current
  `README.md` is the stock Vite template — replace it entirely. Use the
  decided hero copy verbatim (below), then: a "live app" line with the
  future URL noted as *activating at release*
  (`https://guzzler.github.io/QuietNote/`), the privacy story (all inference
  in-browser, IndexedDB-only storage, open source so the claim is
  verifiable), the four modes in one line each (freewrite, check-in, thought
  record, gratitude), an honest safety note (AI journaling companion, not
  therapy or crisis support), browser requirements (WebGPU reality),
  model-download expectations (size + one-time, from R1b — use "roughly a
  couple of GB" placeholder if R1b hasn't landed), 2–3 screenshots; dev
  setup below the fold. Do NOT add a LICENSE file (Sharang's call).
  **Decided hero copy (2026-07-10):**
  > **QuietNote** is a private AI journal that runs entirely in your
  > browser. The language model downloads to your device and every word you
  > write stays in local browser storage — nothing you type is ever sent to
  > a server. It's open source so you don't have to take that claim on
  > faith.
  → Verify: renders correctly on the repo front page; screenshots committed.

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
| 2026-07-10 | R1a — Pages deploy workflow (dormant) + Vite base | #79 | Shipped. Build job = CI; deploy job gated on `!private`, skips until R4. Found+fixed `/logo.svg` absolute-path 404 under base (App.tsx → `import.meta.env.BASE_URL`). `vite preview` at `/QuietNote/` zero 404s; 1318 tests green. |
| 2026-07-10 | R1b — Production-build backend smoke (local) | #80 | WebLLM ✅ (1.49 GB, exchange + persistence), Transformers.js ✅ (3.15 GB, exchange), MediaPipe ❌ (`CalculatorGraph::Run() failed` at inference; no model cache) → queued R1d. Found Lora font missing from `dist/` → queued R1c. Screenshots in `docs/screenshots/2026-07-10/`. |

## Blocked on Sharang

- **Go-public + Pages activation (R4)** — the release-day trigger. The loop
  prepares everything; Sharang flips visibility when he declares the app
  ready. Never flip it autonomously.
- **LICENSE choice** — no license file yet (default all-rights-reserved).
  Suggest MIT; execute must not add one autonomously.
