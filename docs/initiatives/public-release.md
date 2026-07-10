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
- Repo public as of 2026-07-10. Pages not yet enabled. No LICENSE file (see
  Blocked).
- 1300+ Vitest tests; `npm run build` is TS-strict and must stay green.

## Increments

| id | what | status |
|---|---|---|
| R1a | Pages deploy pipeline (workflow + `base` + enable Pages) | queued |
| R1b | Live-URL smoke test of all 3 backends + persistence | queued |
| R2 | Cold-start audit on the live URL (fresh profile: download UX, failure states, browser matrix doc, graceful unsupported-browser state, mobile honesty) | after R1b |
| R3a | README rewrite for strangers | queued |
| R3b | In-app about/footer link to the repo ("open source — verify it yourself") | after R3a |

## Task queue

- [ ] 2026-07-10 · **R1a — Pages deploy pipeline**: add
  `.github/workflows/deploy.yml` — on push to `main`: `npm ci`,
  `npm run build`, `actions/configure-pages` + `actions/upload-pages-artifact`
  (`dist/`) + `actions/deploy-pages`; permissions `contents: read`,
  `pages: write`, `id-token: write`; a `pages` concurrency group. Set Vite
  `base: "/QuietNote/"` (confirm dev server still serves at `/`). Enable
  Pages via `gh api repos/Guzzler/QuietNote/pages -X POST -f
  build_type=workflow` (409 → already enabled, use `-X PUT`). → Verify: PR,
  merge, `gh run watch`, then the live URL serves the app shell with zero
  404s in the network log; screenshot to `docs/screenshots/2026-07-10/`.
- [ ] 2026-07-10 · **R1b — Live-URL backend smoke test**: on
  `https://guzzler.github.io/QuietNote/` in a real browser session: default
  backend downloads its model (progress visible), one full journal exchange
  streams, reload → session persists (IndexedDB). Then try the other two
  backends. → Verify: screenshots of the exchange; if any backend fails on
  the Pages origin, record the exact console error in this doc's grounding
  section and add the follow-up (coi-serviceworker or honest UI note) to the
  queue — do not block this task's PR on fixing it.
- [ ] 2026-07-10 · **R3a — README rewrite for strangers**: read the current
  `README.md` first; rewrite top-down for a visitor: what QuietNote is (2–3
  sentences), live URL prominently, the privacy story (all inference
  in-browser, IndexedDB-only storage, open source so the claim is
  verifiable), browser requirements (WebGPU reality), model-download
  expectations (size + one-time), 2–3 screenshots; move dev setup below the
  fold. Do NOT add a LICENSE file (Sharang's call). → Verify: renders
  correctly on the repo front page; screenshots committed.

## Ledger

| date | item | PR | outcome |
|---|---|---|---|

## Blocked on Sharang

- **LICENSE choice** — repo is public with no license (default
  all-rights-reserved). Suggest MIT; execute must not add one autonomously.
