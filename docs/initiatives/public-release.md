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

- [ ] 2026-07-10 · **R1a — Pages deploy workflow (dormant until public)**:
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
- [ ] 2026-07-10 · **R1b — Production-build backend smoke (local)**: against
  `npx vite preview` (the built `dist/`, not the dev server) in a real
  browser session: default backend downloads its model (progress visible),
  one full journal exchange streams, reload → session persists (IndexedDB).
  Then try the other two backends. → Verify: screenshots of the exchange;
  record measured model-download sizes in this doc (human-feedback F2 needs
  them); if a backend fails under the production build, record the exact
  console error here and queue the follow-up — do not block this task's PR
  on fixing it. (Live-URL re-run happens at R4.)
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

## Ledger

| date | item | PR | outcome |
|---|---|---|---|

## Blocked on Sharang

- **Go-public + Pages activation (R4)** — the release-day trigger. The loop
  prepares everything; Sharang flips visibility when he declares the app
  ready. Never flip it autonomously.
- **LICENSE choice** — no license file yet (default all-rights-reserved).
  Suggest MIT; execute must not add one autonomously.
